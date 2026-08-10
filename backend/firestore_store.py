import uuid
from datetime import datetime, timezone
from google.cloud import firestore

_db = firestore.Client()
_COLLECTION = "sessions"

def create_session(
    situation: str,
    meeting_type: str,
    language: str = "es",
    director_ids: list[str] | None = None,
) -> str:
    session_id = str(uuid.uuid4())
    _db.collection(_COLLECTION).document(session_id).set({
        "situation": situation,
        "meeting_type": meeting_type,
        "language": language,
        "director_ids": director_ids,
        "status": "running",
        "turns": [],
        "verdict": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return session_id

def get_session(session_id: str) -> dict:
    doc = _db.collection(_COLLECTION).document(session_id).get()
    return doc.to_dict()

def append_turn(session_id: str, director_id: str, text: str) -> None:
    ref = _db.collection(_COLLECTION).document(session_id)
    ref.update({"turns": firestore.ArrayUnion([{"director_id": director_id, "text": text}])})

def set_verdict(session_id: str, verdict: str) -> None:
    _db.collection(_COLLECTION).document(session_id).update({"verdict": verdict})

def set_status(session_id: str, status: str) -> None:
    _db.collection(_COLLECTION).document(session_id).update({"status": status})
