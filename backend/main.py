from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.coach import build_coach_agent
from firestore_store import create_session, get_session
from orchestrator import LANGUAGE_DIRECTIVE, call_agent, run_board_session

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
    director_ids: list[str] | None = None


@app.post("/sessions")
def create_session_endpoint(req: SessionRequest, background_tasks: BackgroundTasks):
    session_id = create_session(
        req.situation, req.meeting_type, req.language, req.director_ids
    )
    background_tasks.add_task(
        run_board_session,
        session_id,
        req.situation,
        req.meeting_type,
        req.language,
        req.director_ids,
    )
    return {"session_id": session_id}


@app.get("/sessions/{session_id}")
def get_session_endpoint(session_id: str):
    return get_session(session_id)


class CoachRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    language: str = "es"


@app.post("/coach")
def coach_endpoint(req: CoachRequest):
    """Generic completion endpoint: runs `system_prompt` against
    `user_prompt` through Gemini/Vertex AI and returns the raw text.

    Serves both the full written report and the chairman follow-up chat
    from the frontend (see `frontend/src/lib/aiClient.js`'s `callCoach`) —
    same generic shape as the original product's `/api/coach`, non-streaming
    to match this codebase's existing `call_agent` pattern. No rate-limiting
    or API-key gating: this build is entirely free/unlimited (see Task 15
    brief), unlike the original's free-tier/BYOK split.
    """
    user_prompt = req.user_prompt
    if req.language == "en":
        user_prompt = user_prompt + LANGUAGE_DIRECTIVE

    agent = build_coach_agent(req.system_prompt)
    text = call_agent(agent, user_prompt)
    return {"text": text}
