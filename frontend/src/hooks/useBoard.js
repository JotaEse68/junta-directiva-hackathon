import { useState, useCallback, useRef } from 'react'
import { createSession, subscribeToSession, pauseSession, resumeSession } from '../lib/firestoreClient.js'

export function useBoard() {
  const [turns, setTurns] = useState([])
  const [verdict, setVerdict] = useState(null)
  const [status, setStatus] = useState('idle')
  const [paused, setPaused] = useState(false)

  const unsubscribeRef = useRef(null)
  const sessionIdRef = useRef(null)

  const convene = useCallback(async (situation, meetingType, language, directorIds) => {
    unsubscribeRef.current?.()
    setTurns([])
    setVerdict(null)
    setStatus('starting')
    setPaused(false)

    try {
      const sessionId = await createSession(situation, meetingType, language, directorIds)
      sessionIdRef.current = sessionId

      unsubscribeRef.current = subscribeToSession(sessionId, (data) => {
        if (!data) return
        setTurns(data.turns || [])
        setVerdict(data.verdict ?? null)
        setStatus(data.status || 'running')
        setPaused(data.paused ?? false)
      })

      return sessionId
    } catch (err) {
      // createSession failed before any session was ever created — reset to
      // idle so the caller's UI falls back to
      // the initial form instead of being stuck on "starting" forever, and
      // rethrow so the caller (App.jsx) can surface the error.
      setStatus('idle')
      throw err
    }
  }, [])

  // Pause takes effect between director turns only — the orchestrator polls
  // the `paused` field before starting each turn, so nothing already
  // generated is ever lost or cut off (see backend/orchestrator.py).
  const pause = useCallback(() => {
    if (!sessionIdRef.current) return
    return pauseSession(sessionIdRef.current)
  }, [])

  const resume = useCallback(() => {
    if (!sessionIdRef.current) return
    return resumeSession(sessionIdRef.current)
  }, [])

  return { turns, verdict, status, paused, convene, pause, resume }
}
