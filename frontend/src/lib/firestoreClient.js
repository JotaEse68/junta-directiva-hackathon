import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'

const firebaseConfig = {
  // Firebase web configuration identifies this public app; it is not a
  // server secret. Keep build-time overrides, but include the deployed
  // project fallback so Hosting builds never lose the Firestore listener.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBoMJgtD-VZziXkP58Y4r8OO-d_pfY9olc',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'junta-directiva-hackathon',
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://junta-backend-923278368829.us-central1.run.app'

export async function createSession(situation, meetingType, language, directorIds) {
  const body = { situation, meeting_type: meetingType, language }
  // Only include director_ids when non-null/non-empty, matching how omitting
  // `language` means "use the backend default" — omitting this means "all 12".
  if (directorIds && directorIds.length > 0) {
    body.director_ids = directorIds
  }
  const res = await fetch(`${BACKEND_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || data.detail || `Error ${res.status}`)
  }
  const { session_id } = await res.json()
  return session_id
}

export function subscribeToSession(sessionId, onUpdate) {
  const ref = doc(db, 'sessions', sessionId)
  return onSnapshot(ref, (snap) => onUpdate(snap.data()), (error) => onUpdate(null, error))
}

export async function getSession(sessionId) {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}`)
  if (!res.ok) throw new Error(res.status === 404 ? 'Sesión no disponible' : `Error ${res.status}`)
  return res.json()
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${BACKEND_URL}/sessions/${sessionId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error(`Error ${res.status}`)
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
