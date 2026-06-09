import uuid
from typing import Optional
from database import learning_sessions_col

SUBJECTS = {
    "dsa": "Data Structures & Algorithms",
    "c": "C Programming",
    "python": "Python Programming",
    "cn": "Computer Networks",
    "physics": "Engineering Physics",
    "chemistry": "Engineering Chemistry",
}

def create_session(subject: str, user_id: Optional[str] = None) -> str:
    """Create a new learning session in MongoDB, optionally linked to a user."""
    import datetime
    session_id = str(uuid.uuid4())
    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "subject": subject,
        "stage": "topic",
        "topic": "",
        "context": "",
        "explanation": "",
        "check_question": "",
        "conversation_history": [],
        "quiz": [],
        "quiz_index": 0,
        "quiz_score": 0,
        "quiz_difficulty": 1,
        "perfect_rounds": 0,
        "awaiting_review": False,
        "missed_concept": "",
        "confused_count": 0,
        "session_history": [],
        "visualization": None,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow(),
    }
    learning_sessions_col.insert_one(session_doc)
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve learning session details from MongoDB."""
    sess = learning_sessions_col.find_one({"session_id": session_id})
    if sess:
        sess["_id"] = str(sess["_id"])
        return sess
    return None


def update_session(session_id: str, updates: dict):
    """Update session fields in MongoDB."""
    import datetime
    updates["updated_at"] = datetime.datetime.utcnow()
    learning_sessions_col.update_one({"session_id": session_id}, {"$set": updates})


def add_message(session_id: str, role: str, content: str):
    """Add user or assistant message to session conversation history, capped at 10 items."""
    sess = get_session(session_id)
    if sess:
        history = sess.get("conversation_history", [])
        history.append({"role": role, "content": content})
        if len(history) > 10:
            history = history[-10:]
        update_session(session_id, {"conversation_history": history})


def complete_topic(session_id: str, understood: bool, score: int):
    """Log completed topic into session history and reset active topic state."""
    sess = get_session(session_id)
    if sess:
        history = sess.get("session_history", [])
        history.append({
            "topic": sess["topic"],
            "understood": understood,
            "score": score,
        })
        
        # Reset active learning fields for the next topic
        reset_fields = {
            "session_history": history,
            "stage": "topic",
            "topic": "",
            "context": "",
            "explanation": "",
            "check_question": "",
            "conversation_history": [],
            "quiz": [],
            "quiz_index": 0,
            "quiz_score": 0,
            "quiz_difficulty": 1,
            "perfect_rounds": 0,
            "awaiting_review": False,
            "missed_concept": "",
            "confused_count": 0,
            "visualization": None,
        }
        update_session(session_id, reset_fields)
