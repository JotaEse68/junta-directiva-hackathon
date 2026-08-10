import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import MagicMock, patch

from orchestrator import call_agent_with_key, run_board_session
from firestore_store import create_session, get_session, is_paused


@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_populates_all_turns_and_verdict(mock_call):
    session_id = create_session("¿Contrato al primer empleado?", "strategic")
    run_board_session(session_id, "¿Contrato al primer empleado?", "strategic")
    doc = get_session(session_id)
    assert len(doc["turns"]) == 12
    assert doc["verdict"] == "mocked director response"
    assert doc["status"] == "done"


@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_appends_english_directive_when_language_en(mock_call):
    from orchestrator import LANGUAGE_DIRECTIVE

    session_id = create_session("Should we hire our first employee?", "strategic")
    run_board_session(
        session_id, "Should we hire our first employee?", "strategic", language="en"
    )
    for call in mock_call.call_args_list:
        _, prompt = call.args
        assert prompt.endswith(LANGUAGE_DIRECTIVE)


@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_default_language_leaves_prompt_unchanged(mock_call):
    from orchestrator import LANGUAGE_DIRECTIVE

    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(session_id, situation, "strategic")
    director_calls = mock_call.call_args_list[:-1]
    for call in director_calls:
        _, prompt = call.args
        assert prompt == situation
        assert LANGUAGE_DIRECTIVE not in prompt
    chairman_call = mock_call.call_args_list[-1]
    _, chairman_prompt = chairman_call.args
    assert LANGUAGE_DIRECTIVE not in chairman_prompt


@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_filters_by_director_ids(mock_call):
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(
        session_id,
        situation,
        "strategic",
        director_ids=["estratega", "financiero", "jottarina"],
    )
    doc = get_session(session_id)
    # Only the requested subset ran — one call per director plus one for the chairman.
    assert mock_call.call_count == 4
    assert len(doc["turns"]) == 3
    assert {t["director_id"] for t in doc["turns"]} == {"estratega", "financiero", "jottarina"}
    # The chairman still synthesizes a verdict from whatever subset ran.
    assert doc["verdict"] == "mocked director response"
    assert doc["status"] == "done"


@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_none_director_ids_runs_all_twelve(mock_call):
    # Protects the zero-regression path: omitting director_ids must behave
    # identically to before (all 12, DIRECTORS' own order) — same discipline
    # as Task 13 protected the language default.
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(session_id, situation, "strategic", director_ids=None)
    doc = get_session(session_id)
    assert len(doc["turns"]) == 12
    assert doc["status"] == "done"


@patch("orchestrator.time.sleep", return_value=None)
@patch("orchestrator.is_paused", side_effect=[True, False])
@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_blocks_on_pause_then_resumes(mock_call, mock_is_paused, mock_sleep):
    # is_paused returns True once then False: the poll loop must actually
    # loop (sleep once, re-check, see it's no longer paused) before letting
    # call_agent run for the first director — not be a no-op.
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(
        session_id, situation, "strategic", director_ids=["estratega"]
    )
    assert mock_is_paused.call_count >= 2
    mock_sleep.assert_called_once()
    assert mock_call.call_count == 2  # one director + chairman
    doc = get_session(session_id)
    assert doc["status"] == "done"


@patch("orchestrator.time.sleep", return_value=None)
@patch("orchestrator.is_paused", return_value=False)
@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_default_unpaused_never_sleeps(mock_call, mock_is_paused, mock_sleep):
    # Zero-regression path: a session that's never paused must run straight
    # through with no delay at all — is_paused is still consulted (cheap
    # field read) but time.sleep must never be invoked.
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(
        session_id, situation, "strategic", director_ids=["estratega"]
    )
    mock_sleep.assert_not_called()
    assert mock_call.call_count == 2


# --- Task 20: BYOK path (call_agent_with_key + run_board_session's api_key routing) ---


@patch("orchestrator.genai.Client")
def test_call_agent_with_key_uses_users_own_key_and_returns_text(mock_client_cls):
    # Mocks google.genai.Client the same way ADK internals are mocked
    # elsewhere in this file — no real network call, and confirms the exact
    # shape verified against the installed SDK: Client(api_key=...),
    # .models.generate_content(model=..., contents=..., config=...), and the
    # response's `.text` property.
    mock_response = MagicMock()
    mock_response.text = "byok response"
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    mock_client_cls.return_value = mock_client

    result = call_agent_with_key("user-supplied-key", "system prompt", "user prompt")

    assert result == "byok response"
    mock_client_cls.assert_called_once_with(api_key="user-supplied-key")
    _, kwargs = mock_client.models.generate_content.call_args
    assert kwargs["contents"] == "user prompt"
    assert kwargs["config"].system_instruction == "system prompt"


@patch("orchestrator.call_agent_with_key", return_value="byok director response")
@patch("orchestrator.call_agent")
def test_run_board_session_with_api_key_routes_to_byok_path_only(
    mock_call_agent, mock_call_agent_with_key
):
    # When api_key is supplied, every director + chairman call must go
    # through call_agent_with_key — the default ADK/Vertex call_agent must
    # never be invoked at all.
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(
        session_id,
        situation,
        "strategic",
        director_ids=["estratega", "financiero"],
        api_key="user-supplied-key",
    )
    mock_call_agent.assert_not_called()
    assert mock_call_agent_with_key.call_count == 3  # 2 directors + chairman
    for call in mock_call_agent_with_key.call_args_list:
        args, _ = call
        assert args[0] == "user-supplied-key"
    doc = get_session(session_id)
    assert doc["verdict"] == "byok director response"
    assert doc["status"] == "done"


@patch("orchestrator.call_agent_with_key")
@patch("orchestrator.call_agent", return_value="mocked director response")
def test_run_board_session_default_api_key_none_stays_on_default_path(
    mock_call_agent, mock_call_agent_with_key
):
    # Zero-regression protection: omitting api_key (the default) must never
    # touch call_agent_with_key at all — byte-identical to pre-Task-20
    # behavior, same discipline as every other optional param in this file.
    situation = "¿Contrato al primer empleado?"
    session_id = create_session(situation, "strategic")
    run_board_session(
        session_id, situation, "strategic", director_ids=["estratega"]
    )
    mock_call_agent_with_key.assert_not_called()
    assert mock_call_agent.call_count == 2  # one director + chairman
    doc = get_session(session_id)
    assert doc["status"] == "done"
