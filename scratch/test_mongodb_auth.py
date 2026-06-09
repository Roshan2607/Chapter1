import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import pymongo
import certifi

# Ensure we load from backend/.env
load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
print("URI loaded:", MONGODB_URI)

_mongo_kwargs = {
    "serverSelectionTimeoutMS": 5000,
}
if MONGODB_URI and ("mongodb+srv" in MONGODB_URI or "mongodb.net" in MONGODB_URI):
    _mongo_kwargs["tlsCAFile"] = certifi.where()
else:
    _mongo_kwargs["tlsAllowInvalidCertificates"] = True

try:
    client = pymongo.MongoClient(MONGODB_URI, **_mongo_kwargs)
    client.server_info()
    print("Connected to MongoDB!")
    
    db = client["chapter1_db"]
    users_col = db["users"]
    
    email = "mama@gmail.com"
    user = users_col.find_one({"email": email})
    print(f"User {email}:", user)
    
except Exception as e:
    import traceback
    print("Failed to connect or query:")
    traceback.print_exc()
