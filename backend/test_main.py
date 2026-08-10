import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import patch

from fastapi.testclient import TestClient

import rate_limit
from main import app

client = TestClient(app)

def setup_function(_):
    # main.py's rate limit shares the process-wide counter in rate_limit.py —
    # clear it between tests so one test's usage doesn't bleed into another's.
    rate_limit._requests.clear()

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


# --- Task 20: daily free-tier rate limit + BYOK bypass, shared across
# /sessions, /coach, /context ---

@patch("main.call_agent", return_value="mocked coach response")
def test_coach_under_limit_requests_pass(mock_call):
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
        res = client.post(
            "/coach", json={"system_prompt": "sp", "user_prompt": "up"}
        )
        assert res.status_code == 200


@patch("main.call_agent", return_value="mocked coach response")
def test_coach_over_limit_returns_429(mock_call):
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
        client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
    res = client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
    assert res.status_code == 429
    assert res.json()["detail"] == "RATE_LIMIT_EXCEEDED"


@patch("main.call_agent_with_key", return_value="byok coach response")
@patch("main.call_agent", return_value="mocked coach response")
def test_coach_with_api_key_bypasses_limit_regardless_of_count(
    mock_call_agent, mock_call_agent_with_key
):
    # Exhaust the free-tier limit first...
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
        client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
    # ...then a request carrying api_key must still succeed, and must route
    # through call_agent_with_key rather than the default call_agent.
    res = client.post(
        "/coach",
        json={"system_prompt": "sp", "user_prompt": "up", "api_key": "user-key"},
    )
    assert res.status_code == 200
    assert res.json() == {"text": "byok coach response"}
    mock_call_agent_with_key.assert_called_once_with("user-key", "sp", "up")


def test_rate_limit_counter_is_shared_across_endpoints():
    # /coach and /context (both AI-consuming) draw from the same per-IP
    # counter as /sessions — the brief's "3 consultas gratis al día" across
    # all three, not 3 each.
    with patch("main.call_agent", return_value="mocked response"):
        client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
        client.post("/context", json={"type": "note", "content": "some note content here"})
        res = client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
        assert res.status_code == 200  # 3rd request, still under the shared cap of 3
        res2 = client.post("/coach", json={"system_prompt": "sp", "user_prompt": "up"})
        assert res2.status_code == 429  # 4th request across the shared counter


def test_context_over_limit_returns_429_without_hitting_gemini():
    with patch("main.call_agent", return_value="mocked briefing") as mock_call:
        for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
            client.post("/context", json={"type": "note", "content": "some note content here"})
        res = client.post(
            "/context", json={"type": "note", "content": "some note content here"}
        )
        assert res.status_code == 429
        assert res.json()["detail"] == "RATE_LIMIT_EXCEEDED"
        assert mock_call.call_count == rate_limit.MAX_REQUESTS_PER_WINDOW


def test_context_invalid_request_does_not_consume_quota():
    # A 400 (bad input) happens before enforce_rate_limit runs — validation
    # failures must not burn a slot of the caller's daily free-tier quota.
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW + 2):
        res = client.post("/context", json={"type": "bogus", "content": "x"})
        assert res.status_code == 400
    with patch("main.call_agent", return_value="mocked briefing"):
        res = client.post(
            "/context", json={"type": "note", "content": "some note content here"}
        )
        assert res.status_code == 200


@patch("main.create_session", return_value="session-abc")
@patch("main.run_board_session")
def test_sessions_over_limit_returns_429(mock_run, mock_create):
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
        client.post(
            "/sessions", json={"situation": "s", "meeting_type": "strategic"}
        )
    res = client.post(
        "/sessions", json={"situation": "s", "meeting_type": "strategic"}
    )
    assert res.status_code == 429
    assert res.json()["detail"] == "RATE_LIMIT_EXCEEDED"


@patch("main.create_session", return_value="session-abc")
@patch("main.run_board_session")
def test_sessions_with_api_key_bypasses_limit_and_threads_through(
    mock_run, mock_create
):
    for _ in range(rate_limit.MAX_REQUESTS_PER_WINDOW):
        client.post(
            "/sessions", json={"situation": "s", "meeting_type": "strategic"}
        )
    res = client.post(
        "/sessions",
        json={"situation": "s", "meeting_type": "strategic", "api_key": "user-key"},
    )
    assert res.status_code == 200
    # api_key is threaded through as the last positional arg to
    # run_board_session (via BackgroundTasks.add_task).
    call_args = mock_run.call_args
    assert call_args.args[-1] == "user-key"
