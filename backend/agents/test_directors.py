from agents.chairman import build_chairman_agent
from agents.directors import DIRECTORS, build_director_agent


def test_twelve_directors_defined():
    assert len(DIRECTORS) == 12


def test_each_director_has_required_fields():
    for d in DIRECTORS:
        assert d["id"] and d["name"] and d["title"] and d["system_prompt"]


def test_director_ids_are_unique():
    ids = [d["id"] for d in DIRECTORS]
    assert len(ids) == len(set(ids))


def test_build_director_agent_returns_agent_with_matching_name():
    # NOTE: deviates from the brief's suggested assertion
    # (`director["name"] in agent.name`). google-adk's Agent.name is
    # pydantic-validated as a Python identifier and rejects spaces
    # (confirmed empirically — see agents/directors.py docstring), so
    # "Elena Voss" cannot live in `agent.name`. The display name instead
    # lives in `agent.description`, which is free text.
    director = DIRECTORS[0]
    agent = build_director_agent(director)
    assert director["name"] in agent.description
    assert director["id"] in agent.name


def test_build_director_agent_sets_instruction_and_model():
    director = DIRECTORS[0]
    agent = build_director_agent(director)
    assert agent.instruction == director["system_prompt"]
    assert agent.model == "gemini-2.5-flash"


def test_build_chairman_agent_returns_agent():
    agent = build_chairman_agent()
    assert "Roberto Alcántara" in agent.description


def test_build_chairman_agent_uses_verdict_prompt_not_director_bio():
    # Regression guard: build_chairman_agent() must use the verdict-synthesis
    # prompt from frontend/src/hooks/useBoard.js's callVerdict (verdictSystem),
    # not the 'mentor' director's bio system_prompt from directors.js. A prior
    # version wrongly routed through build_director_agent() on the mentor
    # persona.
    agent = build_chairman_agent()
    assert "VEREDICTO FINAL" in agent.instruction
    assert "PRÓXIMOS PASOS" in agent.instruction
    # Make sure it's NOT the director-bio prompt (which never mentions these)
    assert "35 años de experiencia" not in agent.instruction
