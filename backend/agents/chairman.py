"""Chairman agent: closes the board debate with an action-oriented synthesis.

NOTE (fix round): the first version of this file built the chairman agent by
routing through `build_director_agent()` on the 'mentor' persona (Roberto
Alcántara's director-bio system_prompt from directors.js). That was wrong —
the actual chairman/synthesis prompt is a separate, distinct prompt used only
for the closing synthesis. It originally lived in
`frontend/src/hooks/useBoard.js` inside `callVerdict` (the `verdictSystem`
local) and was transcribed verbatim into `CHAIRMAN_SYSTEM_PROMPT` below — it
is not a director bio, it's an instruction to synthesize the whole debate
(consensus points, main disagreement, recommended path, next steps).

NOTE (Task 14 — product quality upgrade): the original prompt closed with a
"VEREDICTO FINAL: proceder / proceder con condiciones / no proceder" —
courtroom-verdict framing the repo owner explicitly flagged as feeling like a
tribunal. `CHAIRMAN_SYSTEM_PROMPT` below reframes step 3 as presenting the
real path(s) the board converged on (or diverged on) and Roberto's call on
which to take and why — guidance, not a ruling — while keeping the
prioritized next-steps close. This file has now diverged from
`frontend/src/hooks/useBoard.js`'s `verdictSystem` (out of this task's scope
per the Task 14 brief); they are no longer verbatim copies of each other.
"""

from google.adk import Agent

from agents.directors import GEMINI_MODEL

CHAIRMAN_SYSTEM_PROMPT = """Eres Roberto Alcántara, Chairman de esta junta directiva. Tras escuchar a todos los directores, tu rol es sintetizar el debate en una guía de acción clara para quien tiene que decidir — no en una sentencia judicial.
Tu síntesis debe:
1. Identificar los 2-3 puntos de consenso más importantes entre los directores
2. Señalar el principal punto de desacuerdo o tensión que surgió en el debate
3. Presentar EL CAMINO A SEGUIR: el o los 1-2 caminos reales sobre los que convergió (o divergió) la junta, y tu llamada como chairman sobre cuál tomar y por qué — con las condiciones específicas si aplica
4. Listar 3 PRÓXIMOS PASOS concretos y priorizados para ejecutar esa decisión
Habla como alguien que ya ha visto esto muchas veces y quiere que el consultante acierte, no como quien dicta un veredicto: sé directo, ejecutivo y claro. Máximo 400 palabras."""


def build_chairman_agent() -> Agent:
    """Build the ADK Agent that plays the Chairman role in the board.

    Uses the verdict-synthesis prompt (CHAIRMAN_SYSTEM_PROMPT) directly —
    NOT the 'mentor' director's bio system_prompt. Follows the same
    identifier-safe name / free-text description convention used for
    directors in `build_director_agent` (see agents/directors.py docstring
    for why `Agent.name` can't hold "Roberto Alcántara" verbatim).
    """
    return Agent(
        name="chairman",
        model=GEMINI_MODEL,
        description="Roberto Alcántara — Chairman (veredicto final de la junta)",
        instruction=CHAIRMAN_SYSTEM_PROMPT,
    )
