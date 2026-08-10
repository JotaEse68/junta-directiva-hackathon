import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

@patch("main.set_paused")
def test_pause_session_endpoint_calls_set_paused_true(mock_set_paused):
    res = client.post("/sessions/abc-123/pause")
    assert res.status_code == 200
    assert res.json() == {"paused": True}
    mock_set_paused.assert_called_once_with("abc-123", True)

@patch("main.set_paused")
def test_resume_session_endpoint_calls_set_paused_false(mock_set_paused):
    res = client.post("/sessions/abc-123/resume")
    assert res.status_code == 200
    assert res.json() == {"paused": False}
    mock_set_paused.assert_called_once_with("abc-123", False)
