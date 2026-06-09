import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SUBJECTS = ["dsa", "c", "python", "cn", "physics", "chemistry"]
DATA_DIR = Path(__file__).parent / "data"
CHROMA_DIR = Path(__file__).parent / "chroma_db"

_indices: dict = {}
_embed_model = None
_chroma_client = None


def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        logger.info("Loading embedding model (first run may take a minute)...")
        _embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
        logger.info("Embedding model loaded.")
    return _embed_model


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        CHROMA_DIR.mkdir(exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return _chroma_client


def _collection_name(subject: str) -> str:
    return f"{subject}_textbook"


def build_index(subject: str):
    """Build index from PDFs in data/{subject}/ folder."""
    from pypdf import PdfReader
    from llama_index.core import Document, VectorStoreIndex, StorageContext, Settings
    from llama_index.core.node_parser import SentenceSplitter
    from llama_index.vector_stores.chroma import ChromaVectorStore

    subject_dir = DATA_DIR / subject
    pdf_files = list(subject_dir.glob("*.pdf"))

    if not pdf_files:
        raise ValueError(f"No PDF files found in {subject_dir}")

    documents = []
    for pdf_path in pdf_files:
        try:
            reader = PdfReader(str(pdf_path))
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                if len(text.strip()) < 50:
                    continue
                doc = Document(
                    text=text,
                    metadata={
                        "page_number": page_num + 1,
                        "subject": subject,
                        "source_file": pdf_path.name,
                    },
                )
                documents.append(doc)
        except Exception as e:
            logger.warning(f"Error reading {pdf_path}: {e}")

    if not documents:
        raise ValueError(f"No readable content found in PDFs for {subject}")

    embed_model = _get_embed_model()
    collection_name = _collection_name(subject)

    # Force a fresh ChromaDB client to avoid stale collection UUID references
    # (critical when running in a background thread after delete+recreate)
    global _chroma_client
    _chroma_client = None
    client = _get_chroma_client()

    # Clear cached index for this subject
    _indices.pop(subject, None)

    # Delete existing collection to rebuild
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    chroma_collection = client.get_or_create_collection(collection_name)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)
    Settings.embed_model = embed_model
    Settings.text_splitter = splitter
    Settings.llm = None

    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )
    _indices[subject] = index
    chunk_count = chroma_collection.count()
    logger.info(f"Built index for {subject}: {chunk_count} chunks")
    return index, chunk_count


def load_index(subject: str):
    """Load existing index from ChromaDB."""
    from llama_index.core import VectorStoreIndex, StorageContext, Settings
    from llama_index.vector_stores.chroma import ChromaVectorStore

    embed_model = _get_embed_model()
    client = _get_chroma_client()
    collection_name = _collection_name(subject)

    chroma_collection = client.get_or_create_collection(collection_name)
    if chroma_collection.count() == 0:
        raise ValueError(f"No indexed content for {subject}")

    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    Settings.embed_model = embed_model
    Settings.llm = None

    index = VectorStoreIndex.from_vector_store(
        vector_store,
        storage_context=storage_context,
    )
    _indices[subject] = index
    return index


def get_index(subject: str):
    """Get index, building if necessary."""
    if subject in _indices:
        return _indices[subject]
    try:
        return load_index(subject)
    except Exception:
        try:
            index, _ = build_index(subject)
            return index
        except Exception as e:
            logger.error(f"Could not get index for {subject}: {e}")
            return None


def retrieve_context(subject: str, topic: str, top_k: int = 3) -> str:
    """Retrieve relevant context for a topic."""
    try:
        index = get_index(subject)
        if index is None:
            return ""
        retriever = index.as_retriever(similarity_top_k=top_k)
        nodes = retriever.retrieve(topic)
        context_parts = []
        for node in nodes:
            context_parts.append(node.get_content())
        return "\n\n---\n\n".join(context_parts)
    except Exception as e:
        logger.error(f"Error retrieving context for {subject}/{topic}: {e}")
        return ""


def index_status() -> dict:
    """Return status of all subject indices."""
    client = _get_chroma_client()
    status = {}
    for subject in SUBJECTS:
        subject_dir = DATA_DIR / subject
        pdf_files = list(subject_dir.glob("*.pdf")) if subject_dir.exists() else []
        has_pdfs = len(pdf_files) > 0

        pdf_names = [f.name for f in pdf_files]
        try:
            collection_name = _collection_name(subject)
            collection = client.get_collection(collection_name)
            count = collection.count()
            status[subject] = {"count": count, "built": count > 0, "has_pdfs": has_pdfs, "pdf_files": pdf_names}
        except Exception:
            status[subject] = {"count": 0, "built": False, "has_pdfs": has_pdfs, "pdf_files": pdf_names}
    return status
