import { createContext, useContext, useState, createElement } from 'react'

const DICT = {
  en: {
    'board.title': 'Your Board of Directors',
    'board.subtitle': '12 specialized directors dig into your situation together — pushing each other, laying out the real options — so you leave with a clear recommendation and next steps, not just an opinion.',
    'meeting.strategic': 'Strategic decision',
    'meeting.problem': 'Problem to solve',
    'meeting.opportunity': 'Opportunity to evaluate',
    'meeting.crisis': 'Crisis management',
    'meeting.analyze': 'Analyze a project',
    'meeting.postmortem': 'Postmortem',
    'meeting.negotiation': 'Prepare a negotiation',
    'meeting.pitch': 'Pitch / Feedback',
    'action.convene': 'Convene the board',
    'action.newSession': 'New board session',
    'action.newSessionShort': 'New session',
    'hero.kicker': 'Your board of directors · 12 experts',
    'board.yourBoard': 'Your board',
    'board.directorsCount': 'directors',
    'board.sequentialNote': 'The debate runs sequentially (each director hears the ones before them) — it can take several minutes.',
    'board.chooseParticipants': 'Choose who participates',
    'board.ofDirectors': 'of {total} directors',
    'board.includeDirector': 'Include {name} in this session',
    'board.removeDirector': 'Remove {name} from this session',
    'board.longDebateWarning': 'The debate is sequential (each director hears the ones before them) — with {count} directors it can take several minutes.',
    'form.chooseAtLeastOne': '⚠️ Choose at least one director',
    'form.meetingType': 'Meeting type',
    'form.situationLabel': 'Situation to discuss',
    'form.situationPlaceholder': 'Describe the situation with context. The more specific you are, the more useful the analysis will be. Include relevant details: market, resources, constraints, deadlines...',
    'form.cmdEnterHint': '⌘+Enter to convene',
    'status.starting': 'Convening the board...',
    'status.done': 'Session complete',
    'status.running': 'Debate in progress',
    'nav.starting': 'Convening...',
    'nav.debate': 'Debate',
    'board.conversationLabel': 'The conversation · click a director to see their profile',
    'roster.fullDirectory': 'Full directory',
    'roster.meetYourBoard': 'Meet your board',
    'roster.viewProfile': 'View {name}’s profile',
    'modal.contributionLabel': 'What they bring to every session',
    'modal.sessionPositionLabel': 'Position in this session',
    'modal.close': 'Close',
    'footer.tagline': 'AI Board of Directors · 12 experts · Powered by Gemini · 2026',
    'report.bannerTitle': 'Full report',
    'report.bannerDesc': 'Goes beyond the verdict: input from all 12 directors ({count} who debated live + the rest in an express take), additional ideas, recommended resources, and a detailed improvement plan.',
    'report.viewButton': '📄 View full report',
    'report.generating': 'Generating...',
    'report.modalTitle': '📄 Full report',
    'report.loadingText': 'Consulting the directors who didn’t debate live and expanding the analysis...',
    'report.expressOpinionsLabel': 'Express opinions from the other directors',
    'report.close': 'Close',
    'report.download': '⬇️ Download report',
    'report.downloadHeading': 'AI BOARD OF DIRECTORS — FULL REPORT',
    'report.downloadSituation': 'SITUATION',
    'report.downloadQuickVerdict': 'QUICK VERDICT',
    'report.downloadExpressOpinions': 'EXPRESS OPINIONS FROM THE OTHER DIRECTORS',
    'chairman.title': 'Ask the Chairman',
    'chairman.placeholder': 'Ask something about the verdict or the debate...',
    'chairman.send': 'Send',
  },
  es: {
    'board.title': 'Tu Junta Directiva',
    'board.subtitle': '12 directores especializados analizan tu situación en profundidad — se rebaten, ponen sobre la mesa las opciones reales — para que salgas con una recomendación clara y próximos pasos, no solo una opinión.',
    'meeting.strategic': 'Decisión estratégica',
    'meeting.problem': 'Problema a resolver',
    'meeting.opportunity': 'Oportunidad a evaluar',
    'meeting.crisis': 'Gestión de crisis',
    'meeting.analyze': 'Analizar proyecto',
    'meeting.postmortem': 'Postmortem',
    'meeting.negotiation': 'Preparar negociación',
    'meeting.pitch': 'Pitch / Feedback',
    'action.convene': 'Convocar la junta',
    'action.newSession': 'Nueva sesión de junta',
    'action.newSessionShort': 'Nueva sesión',
    'hero.kicker': 'Tu junta directiva · 12 expertos',
    'board.yourBoard': 'Tu junta',
    'board.directorsCount': 'directores',
    'board.sequentialNote': 'El debate es secuencial (cada director escucha a los anteriores) — puede tardar varios minutos.',
    'board.chooseParticipants': 'Elige quién participa',
    'board.ofDirectors': 'de {total} directores',
    'board.includeDirector': 'Incluir a {name} en esta sesión',
    'board.removeDirector': 'Quitar a {name} de esta sesión',
    'board.longDebateWarning': 'El debate es secuencial (cada director escucha a los anteriores) — con {count} directores puede tardar varios minutos.',
    'form.chooseAtLeastOne': '⚠️ Elige al menos un director',
    'form.meetingType': 'Tipo de reunión',
    'form.situationLabel': 'Situación a debatir',
    'form.situationPlaceholder': 'Describe la situación con contexto. Cuánto más específico seas, más útil será el análisis. Incluye datos relevantes: mercado, recursos, restricciones, plazos...',
    'form.cmdEnterHint': '⌘+Enter para convocar',
    'status.starting': 'Convocando junta...',
    'status.done': 'Sesión completada',
    'status.running': 'Debate en curso',
    'nav.starting': 'Convocando...',
    'nav.debate': 'Debate',
    'board.conversationLabel': 'La conversación · clic en un director para ver su perfil',
    'roster.fullDirectory': 'Directorio completo',
    'roster.meetYourBoard': 'Conoce a tu junta',
    'roster.viewProfile': 'Ver perfil de {name}',
    'modal.contributionLabel': 'Qué aporta en cada sesión',
    'modal.sessionPositionLabel': 'Posición en esta sesión',
    'modal.close': 'Cerrar',
    'footer.tagline': 'Junta Directiva AI · 12 expertos · Powered by Gemini · 2026',
    'report.bannerTitle': 'Informe completo',
    'report.bannerDesc': 'Va más allá del veredicto: opinión de los 12 directores (los {count} que debatieron en vivo + el resto en exprés), ideas adicionales, recursos recomendados y un plan de mejora detallado.',
    'report.viewButton': '📄 Ver informe completo',
    'report.generating': 'Generando...',
    'report.modalTitle': '📄 Informe completo',
    'report.loadingText': 'Consultando a los directores que no debatieron en vivo y ampliando el análisis...',
    'report.expressOpinionsLabel': 'Opinión exprés de los demás directores',
    'report.close': 'Cerrar',
    'report.download': '⬇️ Descargar informe',
    'report.downloadHeading': 'JUNTA DIRECTIVA AI — INFORME COMPLETO',
    'report.downloadSituation': 'SITUACIÓN',
    'report.downloadQuickVerdict': 'VEREDICTO RÁPIDO',
    'report.downloadExpressOpinions': 'OPINIONES EXPRÉS DE LOS DEMÁS DIRECTORES',
    'chairman.title': 'Pregúntale al Chairman',
    'chairman.placeholder': 'Pregunta algo sobre el veredicto o el debate...',
    'chairman.send': 'Enviar',
  },
}

// Bios de cada director (tags/personality/contribution) en ambos idiomas.
// El lado `es` es el contenido original de directors.js copiado tal cual;
// el lado `en` es la traducción — ver directors.js para el campo `systemPrompt`
// (fuera de alcance de i18n: los prompts al backend siempre van en español).
export const DIRECTOR_I18N = {
  en: {
    estratega: {
      tags: ['Long-term vision', 'Positioning', 'Competitive edge'],
      personality: 'Analytical, unhurried, thinks in systems. Sees the whole board while everyone else is focused on the next move.',
      contribution: 'Spots the strategic pattern no one else catches. Competitive positioning, long-term consequences, and the strategic question nobody is asking yet.',
    },
    financiero: {
      tags: ['Real numbers', 'ROI', 'Cash flow', 'Financial risk'],
      personality: "Blunt with the numbers. Has no interest in pretty ideas that don't add up in Excel.",
      contribution: 'Translates every decision into real numbers: cash flow, ROI, break-even point. Flags the financial risk nobody is seeing and recommends with concrete figures.',
    },
    marketing: {
      tags: ['Brand', 'Audience', 'Positioning', 'Growth'],
      personality: "Obsessed with how the customer perceives things. Knows reality matters less than how it's communicated.",
      contribution: 'Reads the market from the outside. What message the decision sends, how it will be perceived, and one concrete marketing move for the next two weeks.',
    },
    operaciones: {
      tags: ['Execution', 'Process', 'Scalability', 'Resources'],
      personality: 'The one who asks "and how, exactly?" Tears apart plans that don’t survive contact with reality.',
      contribution: "Tears apart plans that don't survive contact with reality. Delivers a 3-step execution plan with a timeline and calls out the real bottlenecks.",
    },
    legal: {
      tags: ['Legal risk', 'Contracts', 'Compliance', 'Protection'],
      personality: "Sees the risks the team's enthusiasm keeps glossing over. Not there to hit the brakes — there to build on solid ground.",
      contribution: "Identifies the legal or regulatory risk before it materializes. Doesn't slow things down — builds on solid ground. Rates the risk level with justification.",
    },
    tecnologia: {
      tags: ['Tech stack', 'Automation', 'AI', 'Infrastructure'],
      personality: 'Thinks in systems and automation. Turns human problems into scalable technical solutions.',
      contribution: 'Turns the problem into a concrete technical solution. Names the specific tool, sizes up implementation complexity, and the cost of not automating.',
    },
    ventas: {
      tags: ['Pipeline', 'Conversion', 'Closing', 'Revenue'],
      personality: "Translates everything into revenue. Impatient with anything that doesn't make money, brilliant at anything that does.",
      contribution: 'Translates everything into revenue. The nearest-term revenue opportunity, one conversion tactic for this week, and the estimated impact on pipeline.',
    },
    producto: {
      tags: ['UX', 'Product', 'Iteration', 'End user'],
      personality: "Speaks for the user who isn't in the room. Knows the best product doesn't always win.",
      contribution: "Speaks for the user who isn't in the room. Identifies the main friction the customer will hit and the most urgent product improvement.",
    },
    personas: {
      tags: ['Team', 'Culture', 'Talent', 'Leadership'],
      personality: "Knows plans fail because of people, not strategy. Sees what the team can and can't actually sustain.",
      contribution: "Sees what the team can and can't sustain. Spots the invisible human challenge and gives the single most important leadership call.",
    },
    datos: {
      tags: ['Metrics', 'Data', 'Decisions', 'KPIs'],
      personality: 'Uneasy with decisions made without data. Demands metrics before committing. Catches confirmation bias.',
      contribution: 'Demands the missing data point before committing. Defines the specific KPIs to measure the outcome and catches the confirmation bias in the room.',
    },
    mentor: {
      tags: ['Experience', 'Context', 'Wisdom', 'Big picture'],
      personality: "Has seen this before, more than once. Doesn't spook easily and doesn't get carried away either. Puts everything in perspective.",
      contribution: 'Has seen this before, more than once. Puts everything in historical perspective and names the single factor that will decide whether this works.',
    },
    jottarina: {
      tags: ['Uncomfortable truths', 'No filter', 'Self-deception', 'Reality check'],
      personality: "Says what everyone's thinking but nobody dares say. Cynical for a reason, blunt because she cares.",
      contribution: "Says what everyone's thinking but nobody dares say. Names the self-deception, the elephant in the room, and the uncomfortable truth — always closing with an actionable direction.",
    },
  },
  es: {
    estratega: {
      tags: ['Visión largo plazo', 'Posicionamiento', 'Ventaja competitiva'],
      personality: 'Analítica, pausada, piensa en sistemas. Ve el tablero completo mientras los demás ven la jugada inmediata.',
      contribution: 'Identifica el patrón estratégico que otros no ven. Posicionamiento competitivo, consecuencias a largo plazo y la pregunta estratégica que nadie está haciéndose.',
    },
    financiero: {
      tags: ['Números reales', 'ROI', 'Cash flow', 'Riesgo financiero'],
      personality: 'Directo con los números. No le interesan las ideas bonitas que no cierran en Excel.',
      contribution: 'Traduce cada decisión a números reales: cash flow, ROI, punto de equilibrio. Señala el riesgo financiero invisible y recomienda con cifras concretas.',
    },
    marketing: {
      tags: ['Marca', 'Audiencia', 'Posicionamiento', 'Growth'],
      personality: 'Obsesionada con la percepción del cliente. Sabe que la realidad importa menos que cómo se comunica.',
      contribution: 'Lee el mercado desde fuera. Qué mensaje comunica la decisión, cómo se percibe, y la acción de marketing concreta para las próximas dos semanas.',
    },
    operaciones: {
      tags: ['Ejecución', 'Procesos', 'Escalabilidad', 'Recursos'],
      personality: 'El que pregunta "¿y cómo exactamente?". Destruye planes que no sobreviven al contacto con la realidad.',
      contribution: 'Destruye planes que no sobreviven al contacto con la realidad. Da el plan de ejecución en 3 pasos con timeline y detecta los cuellos de botella reales.',
    },
    legal: {
      tags: ['Riesgo legal', 'Contratos', 'Compliance', 'Protección'],
      personality: 'Ve los riesgos que celebran el entusiasmo del equipo. No para frenar, sino para construir sobre base sólida.',
      contribution: 'Identifica el riesgo legal o regulatorio antes de que se materialice. No frena — construye sobre base sólida. Evalúa el nivel de riesgo con justificación.',
    },
    tecnologia: {
      tags: ['Tech stack', 'Automatización', 'IA', 'Infraestructura'],
      personality: 'Piensa en sistemas y automatización. Convierte problemas humanos en soluciones técnicas escalables.',
      contribution: 'Convierte el problema en solución técnica concreta. Nombra la herramienta específica, evalúa la complejidad de implementación y el costo de no automatizar.',
    },
    ventas: {
      tags: ['Pipeline', 'Conversión', 'Cierre', 'Revenue'],
      personality: 'Todo lo traduce a revenue. Impaciente con lo que no genera dinero, brillante en lo que sí.',
      contribution: 'Todo lo traduce a revenue. La oportunidad de ingreso más inmediata, la táctica de conversión para esta semana, y el impacto estimado en pipeline.',
    },
    producto: {
      tags: ['UX', 'Producto', 'Iteración', 'Usuario final'],
      personality: 'Representa la voz del usuario que no está en la sala. Entiende que el mejor producto no siempre gana.',
      contribution: 'Representa al usuario que no está en la sala. Identifica la fricción principal que enfrentará el cliente y la mejora de producto más urgente.',
    },
    personas: {
      tags: ['Equipo', 'Cultura', 'Talento', 'Liderazgo'],
      personality: 'Sabe que los planes fallan por personas, no por estrategia. Ve lo que el equipo puede y no puede sostener.',
      contribution: 'Ve lo que el equipo puede y no puede sostener. Detecta el reto humano invisible y da la recomendación de liderazgo más importante.',
    },
    datos: {
      tags: ['Métricas', 'Datos', 'Decisiones', 'KPIs'],
      personality: 'Incómoda con decisiones sin datos. Exige métricas antes de comprometerse. Detecta sesgos de confirmación.',
      contribution: 'Exige el dato que falta antes de comprometerse. Define los KPIs específicos para medir el resultado y detecta los sesgos de confirmación en la sala.',
    },
    mentor: {
      tags: ['Experiencia', 'Contexto', 'Sabiduría', 'Big picture'],
      personality: 'Ha visto esto antes, varias veces. No alarma fácilmente ni se entusiasma sin razón. Pone todo en perspectiva.',
      contribution: 'Ha visto esto antes, varias veces. Pone todo en perspectiva histórica e identifica el único factor que determinará si esto funciona o no.',
    },
    jottarina: {
      tags: ['Verdad incómoda', 'Sin filtros', 'Autoengaño', 'Realidad'],
      personality: 'La que dice lo que todos piensan pero nadie se atreve a decir. Cínica con causa, directa con cariño.',
      contribution: 'Dice lo que todos piensan pero nadie se atreve a decir. Nombra el autoengaño, el elefante en la sala y la verdad incómoda — siempre con una dirección accionable al final.',
    },
  },
}

// Descripciones de cada tipo de reunión (`desc` en directors.js MEETING_TYPES) en ambos idiomas.
// El lado `es` es el contenido original copiado tal cual.
export const MEETING_DESC_I18N = {
  en: {
    decision: 'Launch, hire, pivot, invest...',
    problema: "Something isn't working",
    oportunidad: 'An idea, offer, or market window',
    crisis: 'Urgent — you need to act now',
    proyecto: 'Full due diligence on a project or plan',
    postmortem: 'It already happened — pull out the lessons',
    negociacion: 'Salary, a deal, a funding round...',
    pitch: 'Rehearse your pitch before you give it',
  },
  es: {
    decision: 'Lanzar, contratar, pivotar, invertir...',
    problema: 'Algo no está funcionando',
    oportunidad: 'Una idea, oferta o ventana de mercado',
    crisis: 'Urgente, hay que actuar ya',
    proyecto: 'Due diligence completo de un proyecto o plan',
    postmortem: 'Ya pasó — extrae las lecciones',
    negociacion: 'Salario, deal, ronda de inversión...',
    pitch: 'Ensaya tu presentación antes de darla',
  },
}

export function translate(lang, key) {
  return DICT[lang]?.[key] ?? key
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en')
  const t = (key) => translate(lang, key)
  return createElement(I18nContext.Provider, { value: { lang, setLang, t } }, children)
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
