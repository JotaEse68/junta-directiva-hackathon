import { useState, useCallback, useRef } from 'react'
import { createSession, subscribeToSession } from '../lib/firestoreClient.js'

export function useBoard() {
  const [turns, setTurns] = useState([])
  const [verdict, setVerdict] = useState(null)
  const [status, setStatus] = useState('idle')

  const unsubscribeRef = useRef(null)

  const convene = useCallback(async (situation, meetingType, language) => {
    unsubscribeRef.current?.()
    setTurns([])
    setVerdict(null)
    setStatus('starting')

    const sessionId = await createSession(situation, meetingType, language)

    unsubscribeRef.current = subscribeToSession(sessionId, (data) => {
      if (!data) return
      setTurns(data.turns || [])
      setVerdict(data.verdict ?? null)
      setStatus(data.status || 'running')
    })

    return sessionId
  }, [])

  return { turns, verdict, status, convene }
}
