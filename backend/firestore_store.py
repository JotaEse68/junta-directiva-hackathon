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
        "paused": False,
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

def set_paused(session_id: str, paused: bool) -> None:
    _db.collection(_COLLECTION).document(session_id).update({"paused": paused})

def is_paused(session_id: str) -> bool:
    """Cheap read of just the `paused` field — called repeatedly by the
    orchestrator's poll loop between director turns, so this stays a single
    field read rather than fetching+deserializing the whole session doc."""
    snapshot = (
        _db.collection(_COLLECTION)
        .document(session_id)
        .get(field_paths=["paused"])
    )
    data = snapshot.to_dict() or {}
    return bool(data.get("paused", False))
