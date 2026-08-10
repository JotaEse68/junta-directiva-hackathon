import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import patch

from fastapi.testclient import TestClient

import rate_limit
from main import app

client = TestClient(app)


def setup_function(_):
    # Same reasoning as test_coach.py/test_main.py: rate_limit.py's counter
    # is process-wide, so it must be cleared between tests to avoid one test
    # module's usage exhausting another's free-tier quota within the same
    # pytest run.
    rate_limit._requests.clear()


@patch("main.call_agent", return_value="mocked briefing")
def test_context_note_returns_summary(mock_call):
    res = client.post(
        "/context",
        json={"type": "note", "content": "Vamos a lanzar un producto nuevo en Q3."},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["summary"] == "mocked briefing"
    assert body["chars"] == len("Vamos a lanzar un producto nuevo en Q3.")
    mock_call.assert_called_once()


@patch("main.call_agent", return_value="mocked briefing")
def test_context_extracted_returns_summary(mock_call):
    res = client.post(
        "/context",
        json={"type": "extracted", "content": "Texto extraído de un PDF de 50 páginas."},
    )
    assert res.status_code == 200
    assert res.json()["summary"] == "mocked briefing"


@patch("main.fetch_url_html", return_value="<html><body>" + ("contenido relevante " * 20) + "</body></html>")
@patch("main.call_agent", return_value="mocked briefing")
def test_context_url_fetches_and_summarizes(mock_call, mock_fetch):
    res = client.post("/context", json={"type": "url", "url": "https://example.com/article"})
    assert res.status_code == 200
    body = res.json()
    assert body["summary"] == "mocked briefing"
    mock_fetch.assert_called_once_with("https://example.com/article")
    # the summarized prompt should mention the source URL
    _, prompt = mock_call.call_args.args
    assert "https://example.com/article" in prompt


def test_context_invalid_url_rejected():
    res = client.post("/context", json={"type": "url", "url": "not-a-url"})
    assert res.status_code == 400


def test_context_non_http_url_rejected():
    res = client.post("/context", json={"type": "url", "url": "ftp://example.com/file"})
    assert res.status_code == 400


def test_context_url_missing_rejected():
    res = client.post("/context", json={"type": "url"})
    assert res.status_code == 400


def test_context_empty_content_rejected():
    res = client.post("/context", json={"type": "note", "content": "   "})
    assert res.status_code == 400


def test_context_empty_extracted_rejected():
    res = client.post("/context", json={"type": "extracted", "content": ""})
    assert res.status_code == 400


def test_context_unsupported_type_rejected():
    res = client.post("/context", json={"type": "bogus", "content": "x"})
    assert res.status_code == 400


@patch("main.fetch_url_html", return_value="<html><body>short</body></html>")
def test_context_url_thin_content_rejected(mock_fetch):
    res = client.post("/context", json={"type": "url", "url": "https://example.com"})
    assert res.status_code == 400


@patch("main.call_agent", return_value="mocked briefing")
def test_context_appends_english_directive_when_language_en(mock_call):
    from orchestrator import LANGUAGE_DIRECTIVE

    res = client.post(
        "/context",
        json={"type": "note", "content": "Some note content.", "language": "en"},
    )
    assert res.status_code == 200
    _, prompt = mock_call.call_args.args
    assert prompt.endswith(LANGUAGE_DIRECTIVE)
