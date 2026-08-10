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
