import { useState, useCallback, useEffect, useRef } from 'react'
import { createSession, subscribeToSession, pauseSession, resumeSession, getSession, deleteSession } from '../lib/firestoreClient.js'

const SESSION_KEY = 'junta-hackathon-last-session'
const SESSION_TTL = 24 * 60 * 60 * 1000
const idleProgress = { directorId: null, step: 0, totalSteps: 0, phase: 'idle', createdAt: null, directorProgress: {} }

function remember(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
}

function forget() { localStorage.removeItem(SESSION_KEY) }

export function useBoard() {
  const [turns, setTurns] = useState([])
  const [verdict, setVerdict] = useState(null)
  const [status, setStatus] = useState('idle')
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(idleProgress)
  const [connectionError, setConnectionError] = useState(null)
  const [restoredSession, setRestoredSession] = useState(null)
  const [lastRequest, setLastRequest] = useState(null)

  const unsubscribeRef = useRef(null)
  const sessionIdRef = useRef(null)

  const applySession = useCallback((data, directorIds = []) => {
    if (!data) return
    setTurns(data.turns || [])
    setVerdict(data.verdict ?? null)
    setStatus(data.status || 'running')
    setPaused(data.paused ?? false)
    setProgress({
      directorId: data.current_director_id ?? null,
      step: data.current_step ?? 0,
      totalSteps: data.total_steps ?? directorIds.length ?? 0,
      phase: data.phase ?? 'preparing',
      createdAt: data.created_at ?? null,
      directorProgress: data.director_progress ?? {},
    })
  }, [])

  const attach = useCallback((sessionId, directorIds = []) => {
    unsubscribeRef.current?.()
    sessionIdRef.current = sessionId
    unsubscribeRef.current = subscribeToSession(sessionId, (data, error) => {
      if (error) {
        setConnectionError('Se perdió la conexión con la junta. Tus resultados ya recibidos siguen aquí; puedes reintentar la conexión.')
        return
      }
      setConnectionError(null)
      applySession(data, directorIds)
    })
  }, [applySession])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
      if (!saved || Date.now() - saved.savedAt > SESSION_TTL) { forget(); return }
      getSession(saved.sessionId).then(data => {
        applySession(data, saved.directorIds || [])
        attach(saved.sessionId, saved.directorIds || [])
        setRestoredSession(saved)
      }).catch(() => forget())
    } catch { forget() }
    return () => unsubscribeRef.current?.()
  }, [applySession, attach])

  const convene = useCallback(async (situation, meetingType, language, directorIds) => {
    unsubscribeRef.current?.()
    setTurns([]); setVerdict(null); setStatus('starting'); setPaused(false); setConnectionError(null)
    setProgress({ ...idleProgress, totalSteps: directorIds?.length || 0, phase: 'preparing', createdAt: new Date().toISOString() })
    const request = { situation, meetingType, language, directorIds }
    setLastRequest(request)
    try {
      const sessionId = await createSession(situation, meetingType, language, directorIds)
      remember({ sessionId, ...request })
      setRestoredSession(null)
      attach(sessionId, directorIds)
      return sessionId
    } catch (err) {
      setStatus('idle'); setProgress(idleProgress)
      throw err
    }
  }, [attach])

  const retry = useCallback(async () => {
    if (sessionIdRef.current) {
      setConnectionError(null)
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
      attach(sessionIdRef.current, saved?.directorIds || [])
      try { applySession(await getSession(sessionIdRef.current), saved?.directorIds || []) } catch { setConnectionError('La sesión ya no está disponible. Puedes convocar una nueva junta.') }
      return
    }
    if (lastRequest) return convene(lastRequest.situation, lastRequest.meetingType, lastRequest.language, lastRequest.directorIds)
  }, [attach, applySession, convene, lastRequest])

  const pause = useCallback(() => sessionIdRef.current && pauseSession(sessionIdRef.current), [])
  const resume = useCallback(() => sessionIdRef.current && resumeSession(sessionIdRef.current), [])
  const clearSession = useCallback(async () => {
    unsubscribeRef.current?.()
    const id = sessionIdRef.current
    sessionIdRef.current = null
    forget(); setRestoredSession(null); setConnectionError(null)
    setTurns([]); setVerdict(null); setStatus('idle'); setPaused(false); setProgress(idleProgress)
    if (id) await deleteSession(id).catch(() => {})
  }, [])

  return { turns, verdict, status, paused, progress, connectionError, restoredSession, convene, retry, pause, resume, clearSession }
}
