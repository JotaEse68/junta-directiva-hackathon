import os

os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8081"

from unittest.mock import patch

from orchestrator import run_board_session
from firestore_store import create_session, get_session


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
