"""Background orchestrator for a full board session: runs all 12 directors
plus the chairman verdict, persisting each turn to Firestore as it lands.

This is the piece that makes the entry satisfy "operate beyond the standard
chat loop... run asynchronously in the background" — `run_board_session` is
invoked via FastAPI's `BackgroundTasks` (see main.py), so it keeps running
server-side after the HTTP response for `POST /sessions` has already gone
back to the client.
"""

import asyncio
import time
import uuid
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed

from google.adk.runners import InMemoryRunner
from google.genai import types

from agents.directors import DIRECTORS, build_director_agent
from agents.chairman import CHAIRMAN_SYSTEM_PROMPT, build_chairman_agent
from firestore_store import append_turn, set_verdict, set_status, set_progress, set_director_progress, is_paused

_APP_NAME = "junta-directiva"

# Poll interval for the pause loop, in seconds. Short enough that resuming
# feels near-instant, long enough not to hammer Firestore with reads while a
# session sits paused for a while.
_PAUSE_POLL_INTERVAL_SECONDS = 2


def wait_if_paused(session_id: str) -> None:
    """Blocks between director turns while the session's `paused` flag is
    true, re-checking every `_PAUSE_POLL_INTERVAL_SECONDS`. Never call this
    from inside a single `call_agent` invocation — it must only run between
    turns, so a pause can never cut off a response already in progress.

    Known limitation (acceptable for a hackathon build, see Task 18 brief):
    this wait is unbounded — there is no timeout/auto-cancel if a session is
    left paused indefinitely. A production version would want a safety net
    (e.g. auto-resume or auto-cancel after N minutes paused).
    """
    while is_paused(session_id):
        time.sleep(_PAUSE_POLL_INTERVAL_SECONDS)


def call_agent(agent, prompt: str, attachments: list[dict] | None = None) -> str:
    """Run a single ADK agent synchronously against `prompt` and return its
    final text response.

    ADK wiring (Task 7 Step 6): confirmed against the installed
    google-adk==2.6.3 package (not guessed) —
    `google.adk.runners.InMemoryRunner` bundles an in-memory session service
    with a `Runner`. `Runner.run(...)` (the sync variant, as opposed to
    `run_async`) is documented as "only for local testing and convenience
    purpose" but is safe to call here: it spins its own event loop on a
    background thread and blocks until done, and `run_board_session` (below)
    is itself only ever invoked from inside a FastAPI `BackgroundTasks` job,
    not a web request — so a blocking call here does not block request
    handling.

    Kept as its own top-level function (rather than inlined into
    `run_board_session`) specifically so tests can mock
    `orchestrator.call_agent` without touching ADK/Vertex AI internals.
    """
    runner = InMemoryRunner(agent=agent, app_name=_APP_NAME)
    user_id = "board"
    session_id = str(uuid.uuid4())

    # InMemoryRunner's session service is async-only; Runner.run() (sync)
    # requires the session to already exist before it's invoked.
    asyncio.run(
        runner.session_service.create_session(
            app_name=_APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
    )

    parts = [types.Part(text=prompt)]
    for attachment in attachments or []:
        if attachment.get("kind") != "image":
            continue
        try:
            parts.append(types.Part.from_bytes(
                data=base64.b64decode(attachment["data"]),
                mime_type=attachment["mimeType"],
            ))
        except (KeyError, ValueError):
            continue
    message = types.Content(role="user", parts=parts)

    final_text = ""
    for event in runner.run(
        user_id=user_id, session_id=session_id, new_message=message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_text = "".join(
                part.text for part in event.content.parts if part.text
            )

    return final_text


LANGUAGE_DIRECTIVE = "\n\nIMPORTANT: Write your entire response in English, regardless of the language of the instructions above."
_CROSS_EXAMINATION_LIMIT = 3
_PARALLEL_WORKERS = 3


def run_initial_analysis(session_id: str, director: dict, prompt: str) -> tuple[dict, str]:
    """Run one independent first-pass analysis and publish its real state."""
    set_director_progress(session_id, director["id"], "analyzing")
    text = call_agent(build_director_agent(director), prompt)
    append_turn(session_id, director["id"], text, kind="analysis")
    set_director_progress(session_id, director["id"], "ready")
    return director, text


def run_board_session(
    session_id: str,
    situation: str,
    meeting_type: str,
    language: str = "es",
    director_ids: list[str] | None = None,
) -> None:
    set_status(session_id, "running")
    director_prompt = situation
    if language == "en":
        director_prompt = situation + LANGUAGE_DIRECTIVE

    # When director_ids is provided, only run that subset — filtered by membership
    # against DIRECTORS' own list order (not the incoming list's order), so a
    # malformed/reordered request can't change debate sequencing. When omitted
    # (None, the default), behavior is unchanged: all 12, current order — this is
    # the zero-regression path, same discipline as Task 13's language param.
    directors_to_run = DIRECTORS
    if director_ids is not None:
        directors_to_run = [d for d in DIRECTORS if d["id"] in director_ids]

    responses = []
    total_director_steps = len(directors_to_run)
    # First pass: every selected specialist studies the same briefing at once.
    # This is intentionally independent; the second pass below is where they
    # inspect one another's ideas. The UI gets each completion immediately.
    set_progress(session_id, None, 0, total_director_steps, "parallel_analysis")
    for director in directors_to_run:
        set_director_progress(session_id, director["id"], "waiting")
    wait_if_paused(session_id)
    # Gemini/Vertex requests are concurrent in deliberately small waves. A
    # burst of 12 long ADK runners can exhaust a single Cloud Run instance and
    # leave every response waiting; three gives prompt first results while
    # keeping the background worker healthy.
    with ThreadPoolExecutor(max_workers=min(_PARALLEL_WORKERS, max(1, total_director_steps))) as executor:
        futures = [executor.submit(run_initial_analysis, session_id, director, director_prompt) for director in directors_to_run]
        for future in as_completed(futures):
            director, text = future.result()
            responses.append((director, text))
            set_progress(session_id, director["id"], len(responses), total_director_steps, "parallel_analysis")

    # Cross-examination: a small rotating panel receives the group's actual
    # findings and challenges assumptions before the chairman synthesizes them.
    wait_if_paused(session_id)
    set_progress(session_id, None, total_director_steps, total_director_steps, "contrasting")
    summary = "\n\n".join(f"{director['name']}: {text[:1200]}" for director, text in responses)
    contrast_prompt = (
        f"{director_prompt}\n\nPERSPECTIVAS INICIALES DE LA JUNTA:\n{summary}"
        "\n\nRONDA DE CONTRASTE: identifica una coincidencia o discrepancia relevante "
        "con las aportaciones anteriores y explica qué debería cambiar en la decisión. Sé concreto y breve."
    )
    if language == "en":
        contrast_prompt += LANGUAGE_DIRECTIVE
    for director in directors_to_run[:_CROSS_EXAMINATION_LIMIT]:
        set_director_progress(session_id, director["id"], "contrasting")
        text = call_agent(build_director_agent(director), contrast_prompt)
        append_turn(session_id, director["id"], text, kind="contrast")
        set_director_progress(session_id, director["id"], "ready")

    # Same guarantee before the chairman's turn.
    wait_if_paused(session_id)
    set_progress(session_id, "chairman", total_director_steps, total_director_steps, "synthesizing")
    summary_prompt = "\n\n".join(f"{d['name']}: {t}" for d, t in responses)
    if language == "en":
        summary_prompt = summary_prompt + LANGUAGE_DIRECTIVE
    chairman = build_chairman_agent()
    verdict = call_agent(chairman, summary_prompt)
    set_verdict(session_id, verdict)
    set_status(session_id, "done")
