from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

from firestore_store import create_session, get_session
from orchestrator import run_board_session

app = FastAPI(title="Junta Directiva AI - Hackathon Backend")

@app.get("/health")
def health():
    return {"status": "ok"}


class SessionRequest(BaseModel):
    situation: str
    meeting_type: str


@app.post("/sessions")
def create_session_endpoint(req: SessionRequest, background_tasks: BackgroundTasks):
    session_id = create_session(req.situation, req.meeting_type)
    background_tasks.add_task(run_board_session, session_id, req.situation, req.meeting_type)
    return {"session_id": session_id}


@app.get("/sessions/{session_id}")
def get_session_endpoint(session_id: str):
    return get_session(session_id)
