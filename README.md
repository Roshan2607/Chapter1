# AI Tutor

Adaptive AI tutor for engineering students (CSE/ECE, 3rd & 4th semester).

**Not a chatbot. A structured teaching system.**

## What it does

1. **Explains** any topic from your textbook (RAG — no hallucination)
2. **Visualises** concepts with live interactive embeds (VisuAlgo, CircuitVerse, TURIX Lab) or dynamically-generated p5.js animations
3. **Tests** with progressive MCQ quizzes (3 difficulty levels)
4. **Assesses** open-ended application questions
5. **Adapts** when confused — re-explains from a different angle

## Subjects

| Subject | Key | PDF folder |
|---------|-----|------------|
| Data Structures & Algorithms | `dsa` | `backend/data/dsa/` |
| Digital VLSI | `dvlsi` | `backend/data/dvlsi/` |
| Control Systems | `cs` | `backend/data/cs/` |
| Computer Networks | `networks` | `backend/data/networks/` |

## Setup

### 1. Get a Groq API key
Sign up at https://console.groq.com — free tier is sufficient.

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Start:
```bash
python main.py
# Runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. Add textbook PDFs (optional but recommended)

Drop PDF files into the subject folders:
```
backend/data/dsa/your_textbook.pdf
backend/data/dvlsi/your_textbook.pdf
backend/data/cs/your_textbook.pdf
backend/data/networks/your_textbook.pdf
```

Then click **"Index PDF"** on the subject card (or call `POST /api/index/build`).

**First run**: downloads the embedding model (~130MB). Subsequent runs load from cache.

The app works without PDFs — the AI uses its training data. With PDFs, answers are grounded in your specific textbook.

## Architecture

```
ai-tutor/
├── backend/
│   ├── main.py           # FastAPI app + all routes
│   ├── agents.py         # Groq LLM agent functions
│   ├── rag.py            # LlamaIndex + ChromaDB RAG pipeline
│   ├── visualizations.py # Visualization selector + p5.js generator
│   ├── session.py        # In-memory session state
│   └── data/             # Drop PDFs here
├── frontend/
│   ├── app/
│   │   ├── page.tsx                   # Subject selection
│   │   └── learn/[subject]/page.tsx   # Learning interface
│   ├── components/
│   │   ├── ExplanationCard.tsx  # Structured explanation renderer
│   │   ├── VisualPanel.tsx      # iframe / p5.js visualizer
│   │   ├── QuizCard.tsx         # MCQ quiz component
│   │   └── Sidebar.tsx          # Session history
│   └── lib/
│       ├── api.ts    # Backend API calls
│       └── types.ts  # TypeScript interfaces
```

## Tech stack

**Backend**: Python, FastAPI, LlamaIndex, ChromaDB, HuggingFace embeddings (BAAI/bge-small-en-v1.5), Groq API (llama-3.3-70b-versatile), pypdf

**Frontend**: Next.js 14, Tailwind CSS, TypeScript

## Teaching loop

```
[topic input]
    → explain (streamed) + visualization loads
    
[explore]
    → unlimited follow-up questions
    → "Quiz me" button
    
[quiz] 3 MCQ questions
    → perfect score → harder difficulty OR move on
    → 2/3 → move to check
    → <2/3 → re-explain + retry
    
[check] open-ended application question
    → UNDERSTOOD → next topic
    → PARTIAL → try again
    → CONFUSED → clarify which part, re-explain

[clarify]
    → pick: concept / syntax / analogy
    → targeted re-explanation → back to check
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/session/create` | Create session |
| GET | `/api/index/status` | Check index status |
| POST | `/api/index/build` | Build index from PDFs |
| POST | `/api/explain` | Stream explanation (SSE) |
| POST | `/api/followup` | Stream follow-up answer (SSE) |
| POST | `/api/quiz/generate` | Generate 3 MCQ questions |
| POST | `/api/quiz/answer` | Submit quiz answer |
| POST | `/api/assess` | Assess open-ended answer |
| POST | `/api/reexplain` | Re-explain with focus |
