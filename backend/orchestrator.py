"""Background orchestrator for a full board session: runs all 12 directors
plus the chairman verdict, persisting each turn to Firestore as it lands.

This is the piece that makes the entry satisfy "operate beyond the standard
chat loop... run asynchronously in the background" — `run_board_session` is
invoked via FastAPI's `BackgroundTasks` (see main.py), so it keeps running
server-side after the HTTP response for `POST /sessions` has already gone
back to the client.
"""

import asyncio
import uuid

from google.adk.runners import InMemoryRunner
from google.genai import types

from agents.directors import DIRECTORS, build_director_agent
from agents.chairman import build_chairman_agent
from firestore_store import append_turn, set_verdict, set_status

_APP_NAME = "junta-directiva"


def call_agent(agent, prompt: str) -> str:
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

    message = types.Content(role="user", parts=[types.Part(text=prompt)])

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


def run_board_session(
    session_id: str, situation: str, meeting_type: str, language: str = "es"
) -> None:
    set_status(session_id, "running")
    director_prompt = situation
    if language == "en":
        director_prompt = situation + LANGUAGE_DIRECTIVE

    responses = []
    for director in DIRECTORS:
        agent = build_director_agent(director)
        text = call_agent(agent, director_prompt)
        append_turn(session_id, director["id"], text)
        responses.append((director, text))

    chairman = build_chairman_agent()
    summary_prompt = "\n\n".join(f"{d['name']}: {t}" for d, t in responses)
    if language == "en":
        summary_prompt = summary_prompt + LANGUAGE_DIRECTIVE
    verdict = call_agent(chairman, summary_prompt)
    set_verdict(session_id, verdict)
    set_status(session_id, "done")
