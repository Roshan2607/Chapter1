import os
import hashlib
import hmac
import secrets
import datetime
from typing import Optional
from bson import ObjectId
import pymongo
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment variables are loaded from the backend directory
load_dotenv(Path(__file__).parent / ".env")

class InMemoryCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, key, direction=-1):
        # Sort docs by key. Direction -1 is descending, 1 is ascending
        reverse = direction == -1
        # Use a safe sort key that handles missing keys or None
        self.docs = sorted(
            self.docs,
            key=lambda x: x.get(key) if x.get(key) is not None else datetime.datetime.min,
            reverse=reverse
        )
        return self

    def __iter__(self):
        return iter(self.docs)


class InMemoryCollection:
    def __init__(self, name: str):
        self.name = name
        self.docs = []

    def find(self, filter_dict: dict = None) -> InMemoryCursor:
        if filter_dict is None:
            filter_dict = {}
        matched = []
        for doc in self.docs:
            match = True
            for k, v in filter_dict.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                matched.append(doc)
        return InMemoryCursor(matched)

    def find_one(self, filter_dict: dict) -> Optional[dict]:
        for doc in self.docs:
            match = True
            for k, v in filter_dict.items():
                if k == "_id" and isinstance(v, ObjectId):
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                return doc
        return None

    def insert_one(self, doc: dict):
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self.docs.append(doc)
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc["_id"])

    def delete_one(self, filter_dict: dict):
        doc = self.find_one(filter_dict)
        if doc:
            self.docs.remove(doc)
            class DeleteResult:
                deleted_count = 1
            return DeleteResult()
        class DeleteResultEmpty:
            deleted_count = 0
        return DeleteResultEmpty()

    def delete_many(self, filter_dict: dict):
        count = 0
        docs_to_remove = []
        for doc in self.docs:
            match = True
            for k, v in filter_dict.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                docs_to_remove.append(doc)
        for doc in docs_to_remove:
            self.docs.remove(doc)
            count += 1
        class DeleteResult:
            deleted_count = count
        return DeleteResult()


    def update_one(self, filter_dict: dict, update_op: dict):
        doc = self.find_one(filter_dict)
        if doc and "$set" in update_op:
            doc.update(update_op["$set"])
        class UpdateResult:
            modified_count = 1 if doc else 0
        return UpdateResult()

    def create_index(self, keys, unique=False):
        pass

# ─── Database Initialization & Failsafe Fallback ──────────────────────────────

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000, tlsAllowInvalidCertificates=True)
db = client["chapter1_db"]

use_fallback = False
try:
    # Verify if MongoDB is actively running (fails fast if down)
    client.server_info()
except Exception as e:
    use_fallback = True
    print("\n" + "="*80)
    print(f"WARNING: MongoDB connection failed: {e}")
    print("-> Failsafe activated: falling back to an IN-MEMORY database.")
    print("-> Registering and logging in will work in-memory for testing.")
    print("="*80 + "\n")

if use_fallback:
    users_col = InMemoryCollection("users")
    sessions_col = db_user_sessions = InMemoryCollection("user_sessions")
    learning_sessions_col = InMemoryCollection("learning_sessions")
    cached_visualizations_col = InMemoryCollection("cached_visualizations")
else:
    users_col = db["users"]
    sessions_col = db["user_sessions"]
    learning_sessions_col = db["learning_sessions"]
    cached_visualizations_col = db["cached_visualizations"]
    
    # Initialize real indexes and perform database migrations
    try:
        users_col.create_index("email", unique=True)
        sessions_col.create_index("token", unique=True)
        learning_sessions_col.create_index("session_id", unique=True)
        cached_visualizations_col.create_index([("subject", 1), ("topic", 1)], unique=True)
        
        # Migrate old sessions without timestamps
        learning_sessions_col.update_many(
            {"updated_at": {"$exists": False}},
            {"$set": {"updated_at": datetime.datetime.utcnow(), "created_at": datetime.datetime.utcnow()}}
        )
    except Exception as e:
        print(f"MongoDB Index / Migration warning: {e}")

# ─── Password Cryptography ───────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    salt = secrets.token_hex(16)
    iterations = 100000
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations
    )
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against pbkdf2_sha256 hash securely."""
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        _, iterations, salt, dk_hex = parts
        iterations = int(iterations)
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations
        )
        return hmac.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False

# ─── User Actions ────────────────────────────────────────────────────────────

def register_user(email: str, name: str, password: str) -> dict:
    """Register a new user in MongoDB or in-memory fallback."""
    email_clean = email.strip().lower()
    if not email_clean or not name.strip() or not password:
        raise ValueError("Invalid registration fields")
        
    if users_col.find_one({"email": email_clean}):
        raise ValueError("Email is already registered")

    user_doc = {
        "email": email_clean,
        "name": name.strip(),
        "password_hash": hash_password(password),
        "created_at": datetime.datetime.utcnow()
    }
    
    res = users_col.insert_one(user_doc)
    user_doc["_id"] = str(res.inserted_id)
    # Remove password hash from returned object for safety
    user_doc.pop("password_hash", None)
    return user_doc


def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate email and password, returning user dictionary if valid."""
    email_clean = email.strip().lower()
    user_doc = users_col.find_one({"email": email_clean})
    if not user_doc:
        return None
        
    if verify_password(password, user_doc["password_hash"]):
        user_doc = dict(user_doc)
        user_doc["_id"] = str(user_doc["_id"])
        user_doc.pop("password_hash", None)
        return user_doc
    return None

# ─── Auth Session Lifecycle ──────────────────────────────────────────────────

def create_user_session(user_id_str: str) -> str:
    """Create a secure session token valid for 7 days."""
    token = secrets.token_hex(32)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    
    sessions_col.insert_one({
        "token": token,
        "user_id": user_id_str,
        "expires_at": expires_at,
        "created_at": datetime.datetime.utcnow()
    })
    return token


def verify_user_session(token: str) -> Optional[dict]:
    """Verify session token, returning user details if active and valid."""
    session_doc = sessions_col.find_one({"token": token})
    if not session_doc:
        return None
        
    if session_doc["expires_at"] < datetime.datetime.utcnow():
        sessions_col.delete_one({"token": token})
        return None
        
    user_doc = users_col.find_one({"_id": ObjectId(session_doc["user_id"])})
    if not user_doc:
        return None
        
    user_doc = dict(user_doc)
    user_doc["_id"] = str(user_doc["_id"])
    user_doc.pop("password_hash", None)
    return user_doc


def revoke_user_session(token: str) -> bool:
    """Revoke session token by removing it from the database."""
    res = sessions_col.delete_one({"token": token})
    return res.deleted_count > 0


# ─── Visualization Cache Operations ──────────────────────────────────────────

def get_cached_visualization(subject: str, topic: str) -> Optional[dict]:
    """Retrieve a cached visualization for a given subject and topic."""
    topic_normalized = topic.strip().lower()
    doc = cached_visualizations_col.find_one({"subject": subject, "topic": topic_normalized})
    if doc:
        return {
            "type": doc.get("type"),
            "url": doc.get("url", ""),
            "code": doc.get("code", ""),
            "label": doc.get("label", "")
        }
    return None


def set_cached_visualization(subject: str, topic: str, viz: dict):
    """Cache a generated visualization in the database."""
    topic_normalized = topic.strip().lower()
    filter_query = {"subject": subject, "topic": topic_normalized}
    existing = cached_visualizations_col.find_one(filter_query)
    
    set_payload = {
        "subject": subject,
        "topic": topic_normalized,
        "type": viz["type"],
        "url": viz.get("url", ""),
        "code": viz.get("code", ""),
        "label": viz.get("label", ""),
        "created_at": datetime.datetime.utcnow()
    }
    
    try:
        if existing:
            cached_visualizations_col.update_one(filter_query, {"$set": set_payload})
        else:
            cached_visualizations_col.insert_one(set_payload)
    except Exception as e:
        print(f"Failed to cache visualization: {e}")


# ─── Learning Session Management ──────────────────────────────────────────────

def delete_learning_session(session_id: str, user_id: str) -> bool:
    """Delete a learning session if owned by the user."""
    res = learning_sessions_col.delete_one({"session_id": session_id, "user_id": user_id})
    return res.deleted_count > 0
