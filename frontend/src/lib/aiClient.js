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
//
// `apiKey` (Task 20, optional): when set, sent as `api_key` in the body — the
// backend then routes this call through the BYOK path (call_agent_with_key,
// billed to the user's own Google account) and skips the free-tier daily
// limit entirely. Omitted from the body when null/empty, same "only include
// when non-null" convention as `director_ids` in firestoreClient.js.
export async function callCoach({ system, userMsg, language = 'es', apiKey = null }) {
  const body = { system_prompt: system, user_prompt: userMsg, language }
  if (apiKey) body.api_key = apiKey

  const res = await fetch(`${BACKEND_URL}/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    // On 429 (Task 20 free-tier limit), `detail` is the stable error CODE
    // "RATE_LIMIT_EXCEEDED" (not localized prose) — thrown as-is so callers
    // can map it through i18n, same discipline as useContext.js's error codes.
    throw new Error(data.error || data.detail || `Error ${res.status}`)
  }

  const data = await res.json()
  return data.text
}
