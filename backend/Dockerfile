FROM python:3.10-slim

# Set up a new user with UID 1000 to comply with Hugging Face Space security guidelines
RUN useradd -m -u 1000 user

WORKDIR /app

# Install compiler tools needed to build C-dependencies for LlamaIndex/ChromaDB
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . .

# Create and set permissions for local RAG database directories and Hugging Face caches
ENV HF_HOME=/app/.cache
ENV TRANSFORMERS_CACHE=/app/.cache
RUN mkdir -p /app/.cache /app/data /app/chroma_db && chown -R user:user /app

USER user

# Hugging Face Spaces dynamically binds to port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
