import { useState, useCallback } from 'react'
import { DIRECTORS } from '../lib/directors.js'
import { callCoach } from '../lib/aiClient.js'

// Opinión exprés (2-3 frases) de un director que no participó en el debate en vivo —
// para que ningún miembro de la junta de 12 quede sin decir nada en el informe completo.
// En el build actual el orquestador (backend/orchestrator.py) siempre corre los 12
// directores, así que `missingDirectors` (más abajo) normalmente queda vacío y esto no
// se ejecuta para nadie — se conserva porque es correcto e inofensivo, y queda listo para
// cuando la Task 16 restaure la selección manual de directores y sí puedan quedar ausentes.
async function quickTake({ director, situation, language }) {
  const userMsg = `SITUACIÓN: ${situation}

Como ${director.name} (${director.title}), da tu opinión exprés en 2-3 frases desde tu especialidad. No es un análisis largo — solo tu primera reacción experta y directa, sin rodeos.`
  return callCoach({ system: director.systemPrompt, userMsg, language })
}

// Adaptado del `REPORT_SYSTEM` original (juntadirectiva/src/hooks/useReport.js): se retira
// todo el framing de "informe gratuito"/tier de pago (este build no tiene split free/paid,
// es EL informe) y se ajusta el tono de cierre para que hable como el resto de prompts tras
// la Task 14 — un equipo de asesores expertos, no un tribunal emitiendo un dictamen superior.
const REPORT_SYSTEM = `Eres el equipo editorial de Junta Directiva AI. A partir de un debate ya completado, produces el INFORME COMPLETO: el documento de referencia que el consultante se lleva de esta sesión, más profundo y accionable que el veredicto ya recibido. No repitas el veredicto, amplíalo.

Estructura obligatoria, con estos encabezados exactos en mayúsculas, cada uno en su propia línea. Los cuatro encabezados son marcadores estructurales fijos, NO contenido traducible: escríbelos SIEMPRE literalmente en español y en mayúsculas — "RESUMEN AMPLIADO", "IDEAS ADICIONALES", "RECURSOS Y HERRAMIENTAS RECOMENDADAS", "PLAN DE MEJORA DETALLADO" — exactamente así, incluso si el resto del informe se escribe en otro idioma por instrucciones posteriores sobre el idioma de respuesta. Solo el contenido debajo de cada encabezado va en el idioma solicitado; los encabezados nunca se traducen.

RESUMEN AMPLIADO
Dos o tres párrafos que profundizan en el análisis más allá del veredicto, conectando los puntos de vista de los directores que sí debatieron en vivo con las opiniones exprés de los que no.

IDEAS ADICIONALES
4 a 6 ideas concretas y accionables que NO aparecieron en el veredicto.

RECURSOS Y HERRAMIENTAS RECOMENDADAS
Nombra herramientas, plataformas, metodologías o tipos de recursos reales y conocidos, agrupados por categoría. No inventes URLs ni enlaces específicos — solo nombres reales de herramientas o categorías de búsqueda.

PLAN DE MEJORA DETALLADO
6 a 8 pasos concretos y priorizados. Para cada uno indica el esfuerzo estimado (bajo/medio/alto) entre paréntesis.

Sé denso en valor, cero relleno ni frases genéricas. Escribe como un equipo de asesores expertos que quiere que el consultante ejecute con confianza, no como quien reparte un dictamen. Este informe debe sentirse valioso por sí mismo, no como el anticipo de algo mejor.`

export function useReport() {
  const [report, setReport] = useState(null)       // { text, quickTakes: [{director,text}] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateReport = useCallback(async ({ situation, meetingType, turns, verdict, language }) => {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      // El orquestador (backend/orchestrator.py) corre siempre los 12 directores, así que
      // en la práctica "missingDirectors" queda vacío — se conserva por si algún día vuelve
      // a existir un subconjunto (p.ej. tras la Task 16, un turn cuyo director_id no
      // aparece en `turns`).
      const activeIds = new Set(turns.map(t => t.director_id))
      const missingDirectors = DIRECTORS.filter(d => !activeIds.has(d.id))

      const quickResults = await Promise.all(missingDirectors.map(async (director) => {
        try {
          const text = await quickTake({ director, situation, language })
          return { director, text }
        } catch {
          return { director, text: null }
        }
      }))
      const quickTakes = quickResults.filter(q => q.text)

      const liveSummary = turns
        .map(t => {
          const director = DIRECTORS.find(d => d.id === t.director_id)
          const label = director ? `${director.name} (${director.title})` : t.director_id
          return `${label} [debate en vivo]:\n${t.text}`
        })
        .join('\n\n')
      const quickSummary = quickTakes
        .map(q => `${q.director.name} (${q.director.title}) [opinión exprés]:\n${q.text}`)
        .join('\n\n')

      const reportPrompt = `SITUACIÓN ORIGINAL:
${situation}

TIPO DE REUNIÓN: ${meetingType}

VEREDICTO YA ENTREGADO AL USUARIO (no lo repitas):
${verdict || '(sin veredicto disponible)'}

DEBATE EN VIVO:
${liveSummary}

OPINIONES EXPRÉS DE LOS DIRECTORES QUE NO PARTICIPARON EN VIVO:
${quickSummary || '(todos los directores participaron en vivo)'}

Produce el informe completo siguiendo exactamente la estructura indicada.`

      const text = await callCoach({ system: REPORT_SYSTEM, userMsg: reportPrompt, language })
      setReport({ text, quickTakes })
    } catch (err) {
      setError(err.message || 'No se pudo generar el informe completo')
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => { setReport(null); setError(null) }, [])

  return { report, loading, error, generateReport, reset }
}
