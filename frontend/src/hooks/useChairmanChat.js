import { useState, useCallback } from 'react'
import { callCoach } from '../lib/aiClient.js'
import { DIRECTORS } from '../lib/directors.js'

// Adaptado de juntadirectiva/src/hooks/useChairmanChat.js: se retira por completo
// `FREE_CHAT_LIMIT`/`freeMessagesUsed`/`hasKey`/`onOpenSettings` — este build no tiene
// tope de mensajes gratuitos ni gating por API key (Vertex AI se autentica server-side),
// así que el chat con el Chairman es simplemente ilimitado.
function buildChairmanSystem({ situation, turns, verdict }) {
  const debateSummary = turns
    .map(t => {
      const director = DIRECTORS.find(d => d.id === t.director_id)
      const label = director ? `${director.name} (${director.title})` : t.director_id
      return `${label}: ${t.text}`
    })
    .join('\n\n')

  return `Eres Roberto Alcántara, Chairman de la Junta Directiva AI. Acabas de sintetizar el debate de la junta sobre la situación del usuario y ya diste tu veredicto. Ahora el usuario te hace preguntas de seguimiento directamente a ti.

SITUACIÓN ORIGINAL:
${situation}

DEBATE COMPLETO DE LA JUNTA:
${debateSummary}

TU VEREDICTO YA ENTREGADO:
${verdict}

Responde las preguntas de seguimiento con el mismo tono directo, ejecutivo y cercano del veredicto: eres un asesor que quiere que el consultante acierte, no un juez repitiendo una sentencia. Puedes citar a directores específicos del debate cuando sea relevante. Sé conciso: 2-4 párrafos como máximo, salvo que el usuario pida explícitamente más detalle.`
}

export function useChairmanChat() {
  const [messages, setMessages] = useState([]) // { role: 'user'|'assistant', content }
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  // sessionContext: { situation, turns, verdict, language } — `language` decide si el
  // backend (POST /coach) añade la directiva de responder en inglés, igual que en el
  // resto de llamadas a call_agent (ver backend/orchestrator.py, LANGUAGE_DIRECTIVE).
  const sendMessage = useCallback(async (text, sessionContext) => {
    const question = text.trim()
    if (!question) return

    setSending(true)
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }])

    try {
      const system = buildChairmanSystem(sessionContext)
      const history = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Roberto'}: ${m.content}`).join('\n\n')
      const userMsg = history
        ? `${history}\n\nUsuario: ${question}\n\nResponde como Roberto.`
        : `Usuario: ${question}\n\nResponde como Roberto.`

      const reply = await callCoach({ system, userMsg, language: sessionContext.language })
      setMessages(prev => {
        const next = prev.slice()
        next[next.length - 1] = { role: 'assistant', content: reply }
        return next
      })
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje')
      setMessages(prev => prev.slice(0, -2)) // quita el par user+placeholder fallido
    } finally {
      setSending(false)
    }
  }, [messages])

  const reset = useCallback(() => { setMessages([]); setError(null) }, [])

  return { messages, sending, error, sendMessage, reset }
}
