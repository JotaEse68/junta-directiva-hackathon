"""Coach agent: generic Gemini-backed completion used by `POST /coach`.

This is the Gemini/ADK equivalent of the original product's `/api/coach`
(a Vercel Edge Function calling Anthropic with an arbitrary system+user
prompt). Unlike the director agents (`build_director_agent`) or the chairman
agent (`build_chairman_agent`), which each carry a fixed persona, this agent
has no built-in identity — the caller supplies a full system prompt per
request. It backs two different frontend features that both just need "run
this system prompt against this user prompt and hand back text": the full
written report (`useReport.js`) and the chairman follow-up chat
(`useChairmanChat.js`).
"""

from google.adk import Agent

from agents.directors import GEMINI_MODEL


def build_coach_agent(system_prompt: str) -> Agent:
    """Build a throwaway ADK Agent whose entire identity is `system_prompt`.

    Follows the same construction pattern as `build_chairman_agent()` in
    `agents/chairman.py` (model=GEMINI_MODEL, name="coach", instruction=the
    prompt) but takes the instruction as a parameter instead of hardcoding
    it, since `POST /coach` is a generic endpoint shared by multiple
    features with different prompts.
    """
    return Agent(
        name="coach",
        model=GEMINI_MODEL,
        description="Generic coach agent — system prompt supplied per request",
        instruction=system_prompt,
    )
