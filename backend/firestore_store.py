import uuid
from datetime import datetime, timezone
from google.cloud import firestore
from google.cloud.firestore_v1.field_path import FieldPath

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
        "current_director_id": None,
        "current_step": 0,
        "total_steps": len(director_ids) if director_ids is not None else None,
        "phase": "preparing",
        "director_progress": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return session_id

def get_session(session_id: str) -> dict:
    doc = _db.collection(_COLLECTION).document(session_id).get()
    return doc.to_dict()

def append_turn(session_id: str, director_id: str, text: str, kind: str = "analysis") -> None:
    ref = _db.collection(_COLLECTION).document(session_id)
    ref.update({"turns": firestore.ArrayUnion([{"director_id": director_id, "text": text, "kind": kind}])})

def set_director_progress(session_id: str, director_id: str, state: str) -> None:
    """Update one director without overwriting concurrent colleagues' state."""
    _db.collection(_COLLECTION).document(session_id).update({
        # Use Firestore's escaped API field path so a future custom director
        # id can safely contain punctuation without replacing the whole map.
        FieldPath("director_progress", director_id).to_api_repr(): state,
    })

def set_progress(session_id: str, director_id: str | None, step: int, total_steps: int, phase: str) -> None:
    """Publish the background job stage before a full Gemini response arrives."""
    _db.collection(_COLLECTION).document(session_id).update({
        "current_director_id": director_id,
        "current_step": step,
        "total_steps": total_steps,
        "phase": phase,
    })

def set_verdict(session_id: str, verdict: str) -> None:
    _db.collection(_COLLECTION).document(session_id).update({"verdict": verdict})

def set_status(session_id: str, status: str) -> None:
    updates = {"status": status}
    if status == "done":
        updates.update({"current_director_id": None, "phase": "done"})
    _db.collection(_COLLECTION).document(session_id).update(updates)

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
