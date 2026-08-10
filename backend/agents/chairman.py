"""Chairman agent: closes the board debate with the final verdict.

NOTE (fix round): the first version of this file built the chairman agent by
routing through `build_director_agent()` on the 'mentor' persona (Roberto
Alcántara's director-bio system_prompt from directors.js). That was wrong —
the actual chairman/verdict-synthesis prompt is a separate, distinct prompt
used only for the closing verdict, defined in
`frontend/src/hooks/useBoard.js` inside `callVerdict` (the `verdictSystem`
local, lines ~41-47). It is transcribed verbatim below as
`CHAIRMAN_SYSTEM_PROMPT` — it is not a director bio, it's an instruction to
synthesize the whole debate (consensus points, main disagreement, final
verdict, next steps).
"""

from google.adk import Agent

from agents.directors import GEMINI_MODEL

CHAIRMAN_SYSTEM_PROMPT = """Eres Roberto Alcántara, Chairman de esta junta directiva. Tras escuchar a todos los directores, tu rol es sintetizar el debate y emitir el veredicto final de la junta.
Tu síntesis debe:
1. Identificar los 2-3 puntos de consenso más importantes
2. Señalar el principal punto de desacuerdo o tensión
3. Dar el VEREDICTO FINAL: proceder / proceder con condiciones / no proceder — con las condiciones específicas si aplica
4. Listar 3 PRÓXIMOS PASOS concretos y priorizados
Sé directo, ejecutivo y claro. Máximo 400 palabras."""


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
