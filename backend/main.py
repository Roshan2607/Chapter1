import json
import logging
import os
import random
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import shutil

load_dotenv(Path(__file__).parent / ".env")

import session as sess
import rag
import agents
import visualizations
import database
import email_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Validate API key at startup
_api_key = os.getenv("GROQ_API_KEY")
if not _api_key:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to backend/.env")
logger.info(f"GROQ_API_KEY loaded: {_api_key[:8]}...")

app = FastAPI(title="AI Tutor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth Dependency ──────────────────────────────────────────────────────────

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    token = authorization.split(" ")[1]
    user = database.verify_user_session(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user

# ─── Request Models ────────────────────────────────────────────────────────────

class RequestOTPRequest(BaseModel):
    email: str
    name: str
    password: str

class UserRegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    otp: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class CreateSessionRequest(BaseModel):
    subject: str

class ExplainRequest(BaseModel):
    session_id: str
    topic: str

class FollowUpRequest(BaseModel):
    session_id: str
    question: str

class AssessRequest(BaseModel):
    session_id: str
    answer: str

class QuizGenerateRequest(BaseModel):
    session_id: str

class QuizAnswerRequest(BaseModel):
    session_id: str
    answer: str  # "A" | "B" | "C" | "D"

class ReexplainRequest(BaseModel):
    session_id: str
    focus: str = "concept"  # "concept" | "syntax" | "analogy"

class BuildIndexRequest(BaseModel):
    subject: str

class UploadStatusRequest(BaseModel):
    subject: str

class UpdateSettingsRequest(BaseModel):
    settings: dict

class ClearCacheRequest(BaseModel):
    subject: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_session(session_id: str, user_id: str) -> dict:
    s = sess.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if s.get("user_id") and s.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this session")
    return s

def _sse_chunk(content: str) -> str:
    return f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"


def _sse_done(data: dict) -> str:
    data["type"] = "done"
    return f"data: {json.dumps(data)}\n\n"

# ─── Auth Routes ──────────────────────────────────────────────────────────────

@app.post("/api/auth/request-otp")
def request_otp(req: RequestOTPRequest, background_tasks: BackgroundTasks):
    try:
        otp_code = str(random.randint(100000, 999999))
        database.store_registration_otp(req.email, req.name, req.password, otp_code)
        
        # Send email in background
        background_tasks.add_task(email_service.send_otp_email, req.email, otp_code)
        return {"success": True, "message": "OTP sent"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"OTP request error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/auth/register")
def register(req: UserRegisterRequest, background_tasks: BackgroundTasks):
    try:
        # Verify OTP
        otp_doc = database.verify_and_consume_otp(req.email, req.otp)
        if not otp_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            
        # Register user with verified hash
        user = database.register_verified_user(req.email, otp_doc["name"], otp_doc["password_hash"])
        token = database.create_user_session(user["_id"])
        
        # Send Welcome Email
        background_tasks.add_task(email_service.send_welcome_email, req.email, user["name"])
        
        return {"token": token, "user": user}
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Registration error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/auth/login")
def login(req: UserLoginRequest):
    try:
        user = database.authenticate_user(req.email, req.password)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid email or password")
        token = database.create_user_session(user["_id"])
        return {"token": token, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Login error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        database.revoke_user_session(token)
    return {"success": True}


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload/{subject}")
async def upload_pdf(
    subject: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if subject not in sess.SUBJECTS:
        raise HTTPException(status_code=400, detail=f"Unknown subject: {subject}")
    
    safe_filename = Path(file.filename).name
    if not safe_filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
    data_dir = Path(__file__).parent / "data" / subject
    data_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = data_dir / safe_filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Schedule building the index in the background to avoid blocking/timeouts
    background_tasks.add_task(rag.build_index, subject)
        
    return {"success": True, "filename": safe_filename}


@app.post("/api/session/create")
def create_session(req: CreateSessionRequest, current_user: dict = Depends(get_current_user)):
    if req.subject not in sess.SUBJECTS:
        raise HTTPException(status_code=400, detail=f"Unknown subject: {req.subject}")
    session_id = sess.create_session(req.subject, user_id=current_user["_id"])
    return {"session_id": session_id}


@app.get("/api/session/{session_id}")
def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    s = _require_session(session_id, current_user["_id"])
    s_copy = dict(s)
    if s_copy.get("topic") and not s_copy.get("visualization"):
        try:
            viz = visualizations.get_visualization(s_copy["topic"], s_copy["subject"], s_copy.get("context", ""))
            s_copy["visualization"] = viz
            sess.update_session(session_id, {"visualization": viz})
        except Exception as e:
            logger.error(f"Error generating visualization for session load: {e}")
            s_copy["visualization"] = {
                "type": "p5js",
                "url": "",
                "code": visualizations._simple_p5js(s_copy["topic"]),
                "label": "Fallback visual"
            }
    return s_copy


@app.get("/api/sessions")
def list_sessions(current_user: dict = Depends(get_current_user)):
    """List all learning sessions belonging to the logged-in user."""
    # Query MongoDB for sessions matching the user's ID, sorted by updated_at descending
    docs = database.learning_sessions_col.find({"user_id": current_user["_id"]}).sort("updated_at", -1)
    sessions = []
    for doc in docs:
        sessions.append({
            "session_id": doc["session_id"],
            "subject": doc["subject"],
            "topic": doc.get("topic", ""),
            "updated_at": doc.get("updated_at", doc.get("created_at")),
            "session_history": doc.get("session_history", []),
        })
    return {"sessions": sessions}


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a learning session if owned by the user."""
    success = database.delete_learning_session(session_id, current_user["_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or not owned by user")
    return {"success": True}


@app.post("/api/session/{session_id}/settings")
def update_session_settings(session_id: str, req: UpdateSettingsRequest, current_user: dict = Depends(get_current_user)):
    """Update settings for a specific session."""
    _require_session(session_id, current_user["_id"])
    sess.update_session(session_id, {"settings": req.settings})
    return {"success": True}


@app.post("/api/cache/clear")
def clear_cache(req: ClearCacheRequest, current_user: dict = Depends(get_current_user)):
    """Clear cached visualizations for a given subject."""
    try:
        res = database.cached_visualizations_col.delete_many({"subject": req.subject})
        return {"success": True, "deleted_count": res.deleted_count}
    except Exception as e:
        logger.error(f"Clear cache error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/index/status")
def index_status(current_user: dict = Depends(get_current_user)):
    return rag.index_status()


@app.post("/api/index/build")
async def build_index(req: BuildIndexRequest, current_user: dict = Depends(get_current_user)):
    if req.subject not in sess.SUBJECTS:
        raise HTTPException(status_code=400, detail=f"Unknown subject: {req.subject}")
    try:
        _, chunk_count = rag.build_index(req.subject)
        return {"success": True, "chunks": chunk_count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Build index error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/explain")
async def explain(req: ExplainRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])
    subject = s["subject"]

    # Retrieve context from RAG
    context = rag.retrieve_context(subject, req.topic, top_k=3)

    # Update session
    sess.update_session(req.session_id, {
        "topic": req.topic,
        "context": context,
        "stage": "explore",
        "conversation_history": [],
        "quiz": [],
        "quiz_index": 0,
        "quiz_score": 0,
        "quiz_difficulty": 1,
        "perfect_rounds": 0,
        "confused_count": 0,
        "visualization": None,
    })

    def generate():
        full_text = ""
        try:
            tutor_style = s.get("settings", {}).get("tutor_style", "balanced")
            for chunk in agents.explainer_stream(req.topic, context, s["session_history"], tutor_style=tutor_style):
                full_text += chunk
                yield _sse_chunk(chunk)

            # Extract check question
            check_q = ""
            if "**Check**:" in full_text:
                check_q = full_text.split("**Check**:")[-1].strip()
            elif "**Check**" in full_text:
                check_q = full_text.split("**Check**")[-1].strip().lstrip(":")

            # Update session with explanation
            sess.update_session(req.session_id, {
                "explanation": full_text,
                "check_question": check_q,
            })
            sess.add_message(req.session_id, "assistant", full_text)

            # Get visualization
            try:
                viz = visualizations.get_visualization(req.topic, subject, context)
            except Exception as viz_err:
                logger.error(f"Failed to get visualization in explain: {viz_err}")
                viz = {
                    "type": "p5js",
                    "url": "",
                    "code": visualizations._simple_p5js(req.topic),
                    "label": "Fallback visual",
                }

            # Update session with the generated/fallback visualization
            sess.update_session(req.session_id, {"visualization": viz})

            yield _sse_done({
                "check_question": check_q,
                "visualization": viz,
            })
        except Exception as e:
            logger.error(f"Explain stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/followup")
async def follow_up(req: FollowUpRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])

    sess.add_message(req.session_id, "user", req.question)

    def generate():
        full_text = ""
        try:
            s_current = sess.get_session(req.session_id)
            tutor_style = s_current.get("settings", {}).get("tutor_style", "balanced")
            for chunk in agents.follow_up_stream(
                s_current["topic"],
                req.question,
                s_current["context"],
                s_current["conversation_history"],
                s_current["session_history"],
                tutor_style=tutor_style,
            ):
                full_text += chunk
                yield _sse_chunk(chunk)

            # Determine if we should generate a new visualization for the follow-up
            question_lower = req.question.lower()
            trigger_keywords = ["diagram", "visual", "sketch", "animation", "chart", "graph", "visualisation", "flowchart", "draw"]
            has_trigger_word = any(w in question_lower for w in trigger_keywords)
            existing_viz = s_current.get("visualization")

            # Only generate a new visualization if the user explicitly asks for it
            if has_trigger_word or not existing_viz:
                subject = s_current["subject"]
                context = s_current.get("context", "")
                try:
                    viz = visualizations.get_visualization(req.question, subject, context)
                except Exception as viz_err:
                    logger.error(f"Failed to get visualization in follow_up: {viz_err}")
                    viz = existing_viz or {
                        "type": "p5js",
                        "url": "",
                        "code": visualizations._simple_p5js(req.question),
                        "label": "Fallback visual",
                    }
                # Persist the updated visualization in the session
                sess.update_session(req.session_id, {"visualization": viz})
            else:
                viz = existing_viz

            sess.add_message(req.session_id, "assistant", full_text)
            yield _sse_done({"visualization": viz})
        except Exception as e:
            logger.error(f"Follow-up stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/quiz/generate")
def quiz_generate(req: QuizGenerateRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])
    context = rag.retrieve_context(s["subject"], s["topic"], top_k=2)
    questions = agents.quiz_generator(s["topic"], context, s["quiz_difficulty"])
    sess.update_session(req.session_id, {
        "quiz": questions,
        "quiz_index": 0,
        "quiz_score": 0,
        "stage": "quiz",
    })
    return {"questions": questions}


@app.post("/api/quiz/answer")
def quiz_answer(req: QuizAnswerRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])
    quiz = s["quiz"]
    idx = s["quiz_index"]

    if idx >= len(quiz):
        raise HTTPException(status_code=400, detail="Quiz already complete")

    question = quiz[idx]
    correct = req.answer == question["answer"]
    new_score = s["quiz_score"] + (1 if correct else 0)
    new_idx = idx + 1

    sess.update_session(req.session_id, {
        "quiz_score": new_score,
        "quiz_index": new_idx,
    })

    # Determine next action
    prerequisites = []
    if new_idx < len(quiz):
        next_action = "continue"
    else:
        # All questions answered
        if new_score == 3:
            difficulty = s["quiz_difficulty"]
            perfect_rounds = s["perfect_rounds"] + 1
            if difficulty < 3 and perfect_rounds < 2:
                sess.update_session(req.session_id, {
                    "quiz_difficulty": difficulty + 1,
                    "perfect_rounds": perfect_rounds,
                })
                next_action = "level_up"
            else:
                sess.update_session(req.session_id, {"stage": "check"})
                next_action = "complete"
                prerequisites = agents.discover_prerequisites(s["topic"], s["context"])
        elif new_score >= 2:
            sess.update_session(req.session_id, {"stage": "check"})
            next_action = "complete"
            prerequisites = agents.discover_prerequisites(s["topic"], s["context"])
        else:
            sess.update_session(req.session_id, {
                "quiz_difficulty": 1,
                "stage": "explore",
            })
            next_action = "retry"

    return {
        "correct": correct,
        "explanation": question.get("explanation", ""),
        "correct_answer": question["answer"],
        "correct_text": question["options"][question["answer"]],
        "next": next_action,
        "quiz_score": new_score,
        "quiz_index": new_idx,
        "total": len(quiz),
        "prerequisites": prerequisites,
    }


@app.post("/api/assess")
def assess(req: AssessRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])
    result = agents.assessor(
        s["topic"],
        s["explanation"],
        req.answer,
        s["session_history"],
    )

    score = result.get("score", 3)
    verdict = result.get("verdict", "PARTIAL")
    feedback = result.get("feedback", "")
    confused_count = s["confused_count"]

    if verdict == "UNDERSTOOD":
        sess.complete_topic(req.session_id, understood=True, score=score)
        next_stage = "topic"
    elif verdict == "PARTIAL":
        sess.update_session(req.session_id, {"stage": "check"})
        next_stage = "check"
    else:  # CONFUSED
        if confused_count == 0:
            sess.update_session(req.session_id, {
                "stage": "clarify",
                "confused_count": 1,
            })
            next_stage = "clarify"
        else:
            # Second time confused — auto re-explain
            context = rag.retrieve_context(s["subject"], s["topic"], top_k=1)
            re_content = agents.reexplainer(s["topic"], context, "concept", s["session_history"])
            sess.update_session(req.session_id, {"stage": "check", "confused_count": 0})
            return {
                "score": score,
                "verdict": verdict,
                "feedback": feedback,
                "next_stage": "check",
                "reexplanation": re_content,
                "recommendations": [],
            }

    return {
        "score": score,
        "verdict": verdict,
        "feedback": feedback,
        "next_stage": next_stage,
        "recommendations": result.get("recommendations", []),
    }


@app.post("/api/reexplain")
def reexplain(req: ReexplainRequest, current_user: dict = Depends(get_current_user)):
    s = _require_session(req.session_id, current_user["_id"])
    context = rag.retrieve_context(s["subject"], s["topic"], top_k=1)
    content = agents.reexplainer(
        s["topic"],
        context,
        req.focus,
        s["session_history"],
    )
    sess.update_session(req.session_id, {"stage": "check"})
    return {"content": content}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
