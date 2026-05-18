import os
import json
import threading
from pymongo import MongoClient
from werkzeug.security import generate_password_hash

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/autograder')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'autograder')
MONGO_COLLECTION = os.getenv('MONGO_COLLECTION', 'app_state')
LEGACY_DB_PATH = os.getenv('LEGACY_DB_PATH', os.getenv('DB_PATH', './db.json'))

# Lock for concurrent DB access within this process
db_lock = threading.RLock()
mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
mongo_collection = mongo_client[MONGO_DB_NAME][MONGO_COLLECTION]

APP_STATE_ID = 'default'

def default_db():
    """Default application state."""
    return {
        "teachers": [
            {
                "id": "1",
                "username": "teacher",
                "password_hash": generate_password_hash("password"),
                "email": "teacher@school.com"
            },
            {
                "id": "2",
                "username": "admin",
                "password_hash": generate_password_hash("admin"),
                "email": "admin@school.com"
            }
        ],
        "exams": [],
        "submissions": [],
        "questions": []
    }

def _strip_mongo_id(data):
    if isinstance(data, dict):
        data.pop('_id', None)
    return data

def _load_legacy_db():
    """Load the previous JSON DB once so existing local data can be migrated."""
    if not os.path.exists(LEGACY_DB_PATH):
        return None

    try:
        with open(LEGACY_DB_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None

def load_db():
    """Load application state from MongoDB."""
    with db_lock:
        doc = mongo_collection.find_one({'_id': APP_STATE_ID})
        if doc is None:
            init_db()
            doc = mongo_collection.find_one({'_id': APP_STATE_ID})
        return _strip_mongo_id(doc or default_db())

def save_db(data):
    """Save application state to MongoDB."""
    with db_lock:
        state = dict(data or {})
        state['_id'] = APP_STATE_ID
        mongo_collection.replace_one({'_id': APP_STATE_ID}, state, upsert=True)

def init_db():
    """Initialize MongoDB with default state or migrate the old JSON DB."""
    with db_lock:
        if mongo_collection.find_one({'_id': APP_STATE_ID}) is not None:
            return

        initial_state = _load_legacy_db() or default_db()
        save_db(initial_state)
