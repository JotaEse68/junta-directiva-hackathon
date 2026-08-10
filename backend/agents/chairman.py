"""Chairman agent: closes the board debate.

Roberto Alcántara is explicitly modeled as "Chairman / Mentor" in the
director roster (frontend/src/lib/directors.js, id 'mentor'). The chairman
agent reuses that persona so the closing synthesis carries the same voice
used in the frontend's debate ordering (mentor closes right before
Jottarina's reality check).
"""

from google.adk import Agent

from agents.directors import DIRECTORS, build_director_agent

CHAIRMAN_DIRECTOR_ID = "mentor"


def build_chairman_agent() -> Agent:
    """Build the ADK Agent that plays the Chairman role in the board."""
    chairman_director = next(d for d in DIRECTORS if d["id"] == CHAIRMAN_DIRECTOR_ID)
    return build_director_agent(chairman_director)
