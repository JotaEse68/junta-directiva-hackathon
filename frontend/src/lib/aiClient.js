// COMPETITION BUILD: Gemini via backend proxy only.
// Production version (at github.com/JotaEse68/juntadirectiva) supported multiple
// providers client-side (Claude, OpenAI, Gemini) with a BYOK/apiKey flow and SSE
// streaming from Vercel Edge Functions. This backend (FastAPI/Cloud Run) always
// authenticates to Vertex AI server-side via the Cloud Run service account, so
// there is no client-side API key, no provider branching, and `call_agent`
// (backend/orchestrator.py) is synchronous/non-streaming — so `callCoach` mirrors
// that instead of reimplementing SSE parsing for what is now a single blocking
// HTTP call.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Generic completion call to POST /coach (backend/main.py), which backs both the
// full report (useReport.js) and the chairman follow-up chat (useChairmanChat.js).
export async function callCoach({ system, userMsg, language = 'es' }) {
  const res = await fetch(`${BACKEND_URL}/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_prompt: system, user_prompt: userMsg, language }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.detail || `Error ${res.status}`)
  }

  const data = await res.json()
  return data.text
}
