from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from firestore_store import create_session, get_session
from orchestrator import run_board_session

app = FastAPI(title="Junta Directiva AI - Hackathon Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://junta-directiva-hackathon.web.app",
        "https://junta-directiva-hackathon.firebaseapp.com",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


class SessionRequest(BaseModel):
    situation: str
    meeting_type: str
    language: str = "es"


@app.post("/sessions")
def create_session_endpoint(req: SessionRequest, background_tasks: BackgroundTasks):
    session_id = create_session(req.situation, req.meeting_type, req.language)
    background_tasks.add_task(
        run_board_session, session_id, req.situation, req.meeting_type, req.language
    )
    return {"session_id": session_id}


@app.get("/sessions/{session_id}")
def get_session_endpoint(session_id: str):
    return get_session(session_id)
