import { createContext, useContext, useState, createElement } from 'react'

const DICT = {
  en: {
    'board.title': 'Your Board of Directors',
    'board.subtitle': '12 specialized directors debate your situation with each other — they listen, they push back — and issue an executive verdict with next steps.',
    'meeting.strategic': 'Strategic decision',
    'meeting.problem': 'Problem to solve',
    'meeting.opportunity': 'Opportunity to evaluate',
    'meeting.crisis': 'Crisis management',
    'meeting.analyze': 'Analyze a project',
    'meeting.postmortem': 'Postmortem',
    'meeting.negotiation': 'Prepare a negotiation',
    'meeting.pitch': 'Pitch / Feedback',
    'action.convene': 'Convene the board',
  },
  es: {
    'board.title': 'Tu Junta Directiva',
    'board.subtitle': '12 directores especializados debaten tu situación entre sí — se escuchan, se rebaten — y emiten un veredicto ejecutivo con próximos pasos.',
    'meeting.strategic': 'Decisión estratégica',
    'meeting.problem': 'Problema a resolver',
    'meeting.opportunity': 'Oportunidad a evaluar',
    'meeting.crisis': 'Gestión de crisis',
    'meeting.analyze': 'Analizar proyecto',
    'meeting.postmortem': 'Postmortem',
    'meeting.negotiation': 'Preparar negociación',
    'meeting.pitch': 'Pitch / Feedback',
    'action.convene': 'Convocar la junta',
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
