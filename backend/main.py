import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents.coach import build_coach_agent
from context_utils import SUMMARY_SYSTEM_PROMPT, extract_text_from_html
from firestore_store import create_session, get_session, set_paused
from orchestrator import LANGUAGE_DIRECTIVE, call_agent, run_board_session

_CONTEXT_MAX_CHARS = 8000
_CONTEXT_FETCH_TIMEOUT = 8.0
_CONTEXT_USER_AGENT = "Mozilla/5.0 (compatible; JuntaDirectivaBot/1.0)"

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


@app.post("/sessions/{session_id}/pause")
def pause_session_endpoint(session_id: str):
    """Sets the `paused` flag the background orchestrator polls between
    director turns (see orchestrator.py's `wait_if_paused`) — never mid-turn,
    so nothing already generated is ever lost or cut off."""
    set_paused(session_id, True)
    return {"paused": True}


@app.post("/sessions/{session_id}/resume")
def resume_session_endpoint(session_id: str):
    set_paused(session_id, False)
    return {"paused": False}


class CoachRequest(BaseModel):
    system_prompt: str
    user_prompt: str
    language: str = "es"


@app.post("/coach")
def coach_endpoint(req: CoachRequest):
    """Generic completion endpoint: runs `system_prompt` against
    `user_prompt` through Gemini and returns the raw text.

    Serves both the full written report and the chairman follow-up chat
    from the frontend (see `frontend/src/lib/aiClient.js`'s `callCoach`) —
    same generic shape as the original product's `/api/coach`, using the
    server-side ADK/Vertex AI path for every request.
    """
    user_prompt = req.user_prompt
    if req.language == "en":
        user_prompt = user_prompt + LANGUAGE_DIRECTIVE

    agent = build_coach_agent(req.system_prompt)
    text = call_agent(agent, user_prompt)
    return {"text": text}


class ContextRequest(BaseModel):
    type: str  # 'url' | 'text' | 'note' | 'extracted'
    content: str | None = None
    url: str | None = None
    language: str = "es"


def fetch_url_html(url: str) -> str:
    """Fetch a page's raw HTML server-side, short timeout, descriptive UA.

    Kept as its own top-level function (same reasoning as `call_agent` in
    orchestrator.py) so tests can mock it directly instead of stubbing httpx
    internals or making a real network call.
    """
    resp = httpx.get(
        url,
        headers={"User-Agent": _CONTEXT_USER_AGENT},
        timeout=_CONTEXT_FETCH_TIMEOUT,
        follow_redirects=True,
    )
    resp.raise_for_status()
    return resp.text


@app.post("/context")
def context_endpoint(req: ContextRequest):
    """Summarize additional context (PDF/Word text, a URL, or a free-text
    note) into an executive briefing before it gets folded into a board
    session's `situation` string client-side (see Task 17 brief — the
    backend never sees "context" as its own concept, just this one-shot
    summarization step).

    Adapted from the original product's `/api/context` (Anthropic-backed
    Vercel Edge Function): same URL-validation / HTML-stripping / prompt
    logic, ported to Gemini via `build_coach_agent`/`call_agent` (the same
    machinery `/coach` uses).
    """
    raw_text = ""
    source_type = req.type

    if req.type == "url":
        if not req.url:
            raise HTTPException(status_code=400, detail="URL requerida")

        try:
            from urllib.parse import urlparse

            parsed = urlparse(req.url)
        except ValueError:
            raise HTTPException(status_code=400, detail="URL inválida")
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise HTTPException(
                status_code=400, detail="Solo se permiten URLs http/https"
            )

        try:
            html = fetch_url_html(req.url)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"No se pudo acceder a la URL ({exc.response.status_code})",
            )
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="No se pudo acceder a la URL")

        raw_text = extract_text_from_html(html)
        if len(raw_text) < 100:
            raise HTTPException(
                status_code=400,
                detail="La página no tiene suficiente contenido de texto",
            )
        source_type = f"URL: {req.url}"

    elif req.type in ("text", "note"):
        raw_text = (req.content or "")[:_CONTEXT_MAX_CHARS]
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Contenido vacío")
        source_type = "nota de texto"

    elif req.type == "extracted":
        raw_text = (req.content or "")[:_CONTEXT_MAX_CHARS]
        if not raw_text.strip():
            raise HTTPException(
                status_code=400, detail="Documento vacío o no legible"
            )
        source_type = "documento"

    else:
        raise HTTPException(status_code=400, detail="Tipo no soportado")

    user_prompt = f"Analiza este contenido ({source_type}) y extrae el briefing ejecutivo:\n\n{raw_text}"
    if req.language == "en":
        user_prompt = user_prompt + LANGUAGE_DIRECTIVE

    agent = build_coach_agent(SUMMARY_SYSTEM_PROMPT)
    summary = call_agent(agent, user_prompt)
    return {"summary": summary, "chars": len(raw_text)}
