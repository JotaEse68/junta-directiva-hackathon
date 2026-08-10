import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export async function createSession(situation, meetingType, language, directorIds, apiKey) {
  const body = { situation, meeting_type: meetingType, language }
  // Only include director_ids when non-null/non-empty, matching how omitting
  // `language` means "use the backend default" — omitting this means "all 12".
  if (directorIds && directorIds.length > 0) {
    body.director_ids = directorIds
  }
  // Task 20 BYOK: only included when the user has connected their own Gemini
  // key — bypasses the free-tier daily limit server-side (see
  // backend/main.py's enforce_rate_limit) and routes every director/chairman
  // call through call_agent_with_key instead of the default ADK/Vertex path.
  if (apiKey) {
    body.api_key = apiKey
  }
  const res = await fetch(`${BACKEND_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    // Same error-code convention as aiClient.js's callCoach: on 429 this is
    // the stable code "RATE_LIMIT_EXCEEDED", not localized prose.
    throw new Error(data.error || data.detail || `Error ${res.status}`)
  }
  const { session_id } = await res.json()
  return session_id
}

export function subscribeToSession(sessionId, onUpdate) {
  const ref = doc(db, 'sessions', sessionId)
  return onSnapshot(ref, (snap) => onUpdate(snap.data()))
}

// Pause/resume an in-progress debate (Task 18): the backend orchestrator has
// no persistent connection back to the client, so these just flip the
// `paused` field on the session doc — the background job polls it between
// director turns (backend/orchestrator.py's wait_if_paused).
export async function pauseSession(sessionId) {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/pause`, { method: 'POST' })
  return res.json()
}

export async function resumeSession(sessionId) {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}/resume`, { method: 'POST' })
  return res.json()
}
