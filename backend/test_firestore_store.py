import os
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"
from firestore_store import create_session, get_session, append_turn, set_status

def test_create_and_get_session():
    sid = create_session("¿Debería lanzar el producto ya?", "strategic")
    doc = get_session(sid)
    assert doc["situation"] == "¿Debería lanzar el producto ya?"
    assert doc["status"] == "running"
    assert doc["turns"] == []

def test_create_session_language_defaults_to_es():
    sid = create_session("test", "strategic")
    assert get_session(sid)["language"] == "es"

def test_create_session_language_persists_en():
    sid = create_session("test", "strategic", language="en")
    assert get_session(sid)["language"] == "en"

def test_append_turn_accumulates():
    sid = create_session("test", "strategic")
    append_turn(sid, "elena-voss", "Mi análisis...")
    doc = get_session(sid)
    assert len(doc["turns"]) == 1
    assert doc["turns"][0]["director_id"] == "elena-voss"

def test_set_status_updates():
    sid = create_session("test", "strategic")
    set_status(sid, "done")
    assert get_session(sid)["status"] == "done"
