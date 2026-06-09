# Chapter1 AI Tutor

An adaptive, research-grounded AI tutoring platform engineered for undergraduate engineering students. The system parses textbook resources, dynamically builds knowledge graphs, structures progressive quizzes, and adapts explanations based on student comprehension and customized tutoring styles.

The platform is designed in a high-contrast neobrutalist aesthetic, using clear visual hierarchies, modern typography (Space Grotesk and Lora), and robust interactive visual panels.

---

## Core Capabilities

1. **Textbook-Grounded Explanations (RAG)**: The tutor retrieves context from multiple uploaded syllabus textbooks rather than drawing from generic, unverified training data. This ensures absolute correctness and aligns terminology with the active university curriculum.
2. **Interactive Concept Visualizations**: A sandboxed panel generates either p5.js canvas animations (for continuous, mathematical, or physical simulations) or Mermaid.js diagrams (for structural, sequence, network, and tree layouts) dynamically based on the requested concept.
3. **Multi-Textbook Management**: Supports dropping and uploading multiple textbook PDFs per subject, automatically extracting text chunks, compiling embeddings, and updating index states asynchronously in the background.
4. **Progressive Assessment Loop**: Evaluates understanding through three difficulty tiers of scenario-based multiple-choice quizzes, followed by an open-ended application check parsed by an AI assessor.
5. **Adaptive Remediation**: If a student demonstrates misconceptions during assessments, the tutor triggers targeted re-explanations from fresh conceptual angles (concept-first, code-first, or analogy-first) rather than repeating the same explanation.
6. **Tutoring Personas**: Offers customizable explanation styles configurable globally from the user profile settings, including:
   - Balanced: A mix of technical specifications and conceptual models.
   - Analogy-First: Heavy focus on vivid real-world systems analogies.
   - Socratic Guide: Minimal explanations using hints and leading questions.
   - Code-First: Straightforward, concrete execution traces and code snippets.
   - ELIA5 (Explain Like I'm 5): Child-friendly metaphors and simple, non-jargon wording.

---

## Technical Architecture

### Directory Layout

```
ai-tutor/
├── .gitignore              # Monorepo version control exclusions
├── README.md               # System overview and usage instructions
├── backend/
│   ├── main.py             # FastAPI entrypoint, HTTP router, and SSE stream controllers
│   ├── agents.py           # LLM agent definitions (assessor, generator, reexplainer, etc.)
│   ├── database.py         # MongoDB connections, session managers, and visual caches
│   ├── session.py          # Session model and state updating helpers
│   ├── rag.py              # LlamaIndex chunking, HuggingFace embeddings, and ChromaDB RAG
│   ├── visualizations.py   # Fallback templates and escape formatting utilities
│   ├── requirements.txt    # Python package dependencies
│   └── data/               # Subject-specific directories for uploaded textbooks
└── frontend/
    ├── app/                # Next.js App Router directories (home, learn, login, subjects)
    ├── components/         # Shared React modules (ScrollReveal, Sidebar, ArrowIcon, etc.)
    ├── lib/                # API wrapper client and TypeScript declarations
    └── next.config.js      # Next.js build compilation and reverse-proxy settings
```

### Technologies Used

- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript, p5.js, Mermaid.js
- **Backend**: Python, FastAPI, LlamaIndex, ChromaDB, HuggingFace Embeddings (BAAI/bge-small-en-v1.5)
- **Database**: MongoDB (User profiles, password registry, session states, and diagram cache)
- **LLM Gateway**: Groq SDK (Llama-3.3-70b-versatile with Llama-3.1-8b-instant rate limit failover)

---

## Database & Authentication Setup

The authentication flow utilizes a MongoDB registry to store credentials and manage persistent states:
- **Hashing Security**: Password hashing is handled via PBKDF2-HMAC-SHA256 with 100,000 iterations and random 16-byte salts.
- **Fail-Safe Fallback**: If local MongoDB is unavailable during boot, the backend automatically activates an in-memory database fallback to allow offline testing and development.
- **User Isolation**: Every learning session and chat log is tied to a user ID. Cross-user requests are blocked by FastAPI auth dependencies.

---

## Local Setup

### 1. Backend Setup

Prerequisite: Python 3.10+ and a running MongoDB instance (optional, falls back to in-memory if down).

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the `backend/` directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   MONGODB_URI=mongodb://localhost:27017
   ```
4. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   The backend will run on `http://localhost:8000`.

### 2. Frontend Setup

Prerequisite: Node.js 18+ and npm.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

---
