import { useState, useCallback } from 'react'
import { DIRECTORS } from '../lib/directors.js'
import { callCoach } from '../lib/aiClient.js'

// Opinión exprés (2-3 frases) de un director que no participó en el debate en vivo —
// para que ningún miembro de la junta de 12 quede sin decir nada en el informe completo.
// Desde la Task 16 el usuario puede elegir un subconjunto de directores para el debate,
// así que `missingDirectors` (más abajo) puede ser no vacío: cualquier director cuyo id
// no aparezca en `turns` recibe aquí su opinión exprés.
async function quickTake({ director, situation, language }) {
  const userMsg = `SITUACIÓN: ${situation}

Como ${director.name} (${director.title}), da tu opinión exprés en 2-3 frases desde tu especialidad. No es un análisis largo — solo tu primera reacción experta y directa, sin rodeos.`
  return callCoach({ system: director.systemPrompt, userMsg, language })
}

// Es exactamente el plan operativo premium del producto de pago, liberado para
// esta entrada del hackathon: no hay versión recortada ni bloqueo de descarga.
const REPORT_SYSTEM = `Eres el equipo editorial de Junta Directiva AI. A partir de un debate ya completado, produces un PLAN DE ACCIÓN OPERATIVO. El usuario ya tiene el veredicto: no lo repitas ni lo reformules; conviértelo en ejecución concreta.

Estructura obligatoria, con estos encabezados exactos en mayúsculas, cada uno en su propia línea. Son marcadores estructurales fijos y deben escribirse siempre literalmente en español, incluso si el contenido está en inglés:

HOJA DE RUTA 30/60/90 DÍAS
Qué debe lograrse en cada horizonte temporal, con hitos verificables.

ACCIONES PRIORITARIAS
6 a 8 acciones concretas, ordenadas por prioridad. Explica brevemente por qué cada una va en ese orden.

RESPONSABLES Y ESFUERZO
Para cada acción, propone el rol responsable y el esfuerzo estimado (bajo/medio/alto).

KPIS Y SEÑALES DE ALERTA
Entre 4 y 6 métricas con objetivo, frecuencia de revisión y la señal que exige corregir el rumbo.

RIESGOS Y CONTINGENCIAS
Los 3 riesgos más relevantes, su impacto y la respuesta concreta si se materializan.

ESCENARIOS DE DECISIÓN
2 o 3 reglas tipo “si ocurre X, haz Y” para las incertidumbres centrales.

Sé específico, denso en valor y cero genérico. Este plan debe ser ejecutable por un equipo mañana mismo.`

export function useReport() {
  const [report, setReport] = useState(null)       // { text, quickTakes: [{director,text}] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateReport = useCallback(async ({ situation, meetingType, turns, verdict, language }) => {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      // Desde la Task 16 el orquestador puede correr solo un subconjunto de directores
      // (director_ids), así que `missingDirectors` puede no estar vacío: cualquier
      // director cuyo id no aparece en `turns` no participó en vivo.
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
