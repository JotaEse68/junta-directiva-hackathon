import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import patch

from fastapi.testclient import TestClient

import rate_limit
from main import app

client = TestClient(app)


def setup_function(_):
    # Task 20's rate limiter shares a process-wide counter (rate_limit.py) —
    # clear it between tests so usage from other test modules sharing this
    # pytest process (e.g. test_main.py's rate-limit tests) doesn't bleed
    # into these, which assume every call starts under the free-tier limit.
    rate_limit._requests.clear()


@patch("main.call_agent", return_value="mocked coach response")
def test_coach_endpoint_returns_text(mock_call):
    res = client.post(
        "/coach",
        json={"system_prompt": "Eres un coach.", "user_prompt": "Hola"},
    )
    assert res.status_code == 200
    assert res.json() == {"text": "mocked coach response"}
    mock_call.assert_called_once()


@patch("main.call_agent", return_value="mocked coach response")
def test_coach_endpoint_appends_english_directive_when_language_en(mock_call):
    from orchestrator import LANGUAGE_DIRECTIVE

    res = client.post(
        "/coach",
        json={
            "system_prompt": "You are a coach.",
            "user_prompt": "Hi",
            "language": "en",
        },
    )
    assert res.status_code == 200
    _, prompt = mock_call.call_args.args
    assert prompt.endswith(LANGUAGE_DIRECTIVE)


@patch("main.call_agent", return_value="mocked coach response")
def test_coach_endpoint_default_language_leaves_prompt_unchanged(mock_call):
    from orchestrator import LANGUAGE_DIRECTIVE

    res = client.post(
        "/coach",
        json={"system_prompt": "Eres un coach.", "user_prompt": "Hola"},
    )
    assert res.status_code == 200
    _, prompt = mock_call.call_args.args
    assert prompt == "Hola"
    assert LANGUAGE_DIRECTIVE not in prompt
