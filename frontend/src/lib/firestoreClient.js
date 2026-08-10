import { initializeApp } from 'firebase/app'
import { getFirestore, doc, onSnapshot } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export async function createSession(situation, meetingType, language) {
  const res = await fetch(`${BACKEND_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situation, meeting_type: meetingType, language }),
  })
  const { session_id } = await res.json()
  return session_id
}

export function subscribeToSession(sessionId, onUpdate) {
  const ref = doc(db, 'sessions', sessionId)
  return onSnapshot(ref, (snap) => onUpdate(snap.data()))
}
