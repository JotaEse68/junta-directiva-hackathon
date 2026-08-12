import React, { useState, useCallback, useMemo } from 'react'
import ChairmanChat from './components/ChairmanChat.jsx'
import ContextPanel from './components/ContextPanel.jsx'
import DebateChat from './components/DebateChat.jsx'
import DirectorModal from './components/DirectorModal.jsx'
import DirectorsRoster from './components/DirectorsRoster.jsx'
import DownloadBanner from './components/DownloadBanner.jsx'
import ReportModal from './components/ReportModal.jsx'
import VerdictPanel from './components/VerdictPanel.jsx'
import { useBoard } from './hooks/useBoard.js'
import { useChairmanChat } from './hooks/useChairmanChat.js'
import { useContextBuilder } from './hooks/useContext.js'
import { useReport } from './hooks/useReport.js'
import { DIRECTORS, MEETING_TYPES, selectDirectorsForMeeting, orderForDebate } from './lib/directors.js'
import { computeConsensus } from './lib/consensus.js'
import { I18nProvider, useI18n, DIRECTOR_I18N, MEETING_DESC_I18N } from './lib/i18n.js'

const MAX_CHARS = 800

// Mapea el id de tipo de reunión (en español, usado internamente en lib/directors.js)
// a la clave de traducción i18n correspondiente para su etiqueta.
const MEETING_TYPE_KEYS = {
  decision: 'meeting.strategic',
  problema: 'meeting.problem',
  oportunidad: 'meeting.opportunity',
  crisis: 'meeting.crisis',
  proyecto: 'meeting.analyze',
  postmortem: 'meeting.postmortem',
  negociacion: 'meeting.negotiation',
  pitch: 'meeting.pitch',
}

const EXAMPLE_KEYS = ['form.exampleHire', 'form.exampleLaunch', 'form.exampleInvest', 'form.exampleCrisis']

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}

function AppInner() {
  const { lang, setLang, t } = useI18n()
  const [situation, setSituation]   = useState('')
  const [submittedSituation, setSubmittedSituation] = useState('')
  const [meetingType, setMeetingType] = useState('decision')
  const [selectedIds, setSelectedIds] = useState(() => selectDirectorsForMeeting('decision', DIRECTORS).map(d => d.id))
  const [selectedDirector, setSelectedDirector] = useState(null)

  // El backend (backend/orchestrator.py) acepta un `director_ids` opcional para filtrar
  // qué directores participan (Task 16) — el frontend elige un subconjunto sensato por
  // defecto según el tipo de reunión (selectDirectorsForMeeting) y permite ajustarlo a
  // mano. No hay API key de cliente (Vertex AI se autentica server-side vía la service
  // account de Cloud Run). El hook tampoco expone un `reset`, así que "sesión iniciada"
  // se rastrea localmente: sirve tanto para mostrar la pantalla inicial de nuevo tras
  // "Nueva sesión" como para el estado idle antes del primer convene.
  const { turns, verdict, status, paused, convene, pause, resume } = useBoard()
  const [hasStarted, setHasStarted] = useState(false)

  const [sessionError, setSessionError] = useState(null)

  // Informe completo y chat de seguimiento con el Chairman (Task 15): ambos son
  // features restauradas del producto original, adaptadas a este backend vía el
  // endpoint genérico POST /coach (backend/main.py). Sin selección de directores en
  // este build, así que sessionContext siempre incluye los 12 turns.
  const { report, loading: reportLoading, error: reportError, generateReport } = useReport()
  const { messages: chairmanMessages, sending: chairmanSending, error: chairmanError, sendMessage: sendChairmanMessage } = useChairmanChat()
  const [reportOpen, setReportOpen] = useState(false)

  // Contexto adicional (Task 17, feature restaurada): PDF/Word/URL/nota que se
  // resume server-side (POST /context) y se pliega en el string `situation`
  // antes de convocar — el backend nunca necesita saber que "contexto" existe
  // como concepto propio, ver hooks/useContext.js `buildContextBlock()`.
  const {
    items: ctxItems, addNote: addCtxNote, processFile: processCtxFile,
    processURL: processCtxURL, removeItem: removeCtxItem,
    buildContextBlock, buildSituationBrief, hasContext, isProcessing: ctxProcessing,
  } = useContextBuilder()

  // computeConsensus (lib/consensus.js) espera un mapa { [directorId]: { status, text } };
  // se deriva de `turns` en vez de tocar esa función, ya que solo se le pasan directores
  // que ya completaron su turno.
  const directorStates = useMemo(
    () => Object.fromEntries(turns.map(t => [t.director_id, { status: 'done', text: t.text }])),
    [turns]
  )
  const consensus = useMemo(() => computeConsensus(directorStates), [directorStates])

  const handleMeetingTypeChange = (id) => {
    setMeetingType(id)
    setSelectedIds(selectDirectorsForMeeting(id, DIRECTORS).map(d => d.id))
  }

  const toggleDirector = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const isIdle    = !hasStarted
  const isRunning = hasStarted && status !== 'done'
  const isDone    = hasStarted && status === 'done'

  const doneCount  = turns.length
  // Reflects the director count for the current/last convened session — selectedIds
  // doesn't reset on "Nueva sesión" (handleReset), only when the meeting type changes.
  const totalCount = selectedIds.length

  const handleConvene = useCallback(async () => {
    const writtenSituation = situation.trim()
    const contextOnlySituation = buildSituationBrief()
    const baseSituation = writtenSituation || contextOnlySituation
    if (!baseSituation || !isIdle || selectedIds.length === 0 || ctxProcessing) return
    setSessionError(null)
    setHasStarted(true)
    const directors = orderForDebate(selectedIds, DIRECTORS)
    // El contexto adicional (Task 17) se pliega en `situation` aquí mismo,
    // en el cliente — el backend (orchestrator.py) sigue recibiendo un único
    // string de situación, sin cambios en su pipeline. Se añade después del
    // texto del usuario (no antes) para que la situación tal cual la escribió
    // siga siendo lo primero que lee el modelo, con el contexto como anexo.
    const fullSituation = writtenSituation && hasContext
      ? `${writtenSituation}\n\n${buildContextBlock()}`
      : baseSituation
    try {
      await convene(fullSituation, meetingType, lang, directors.map(d => d.id))
      setSubmittedSituation(fullSituation)
    } catch (err) {
      // Reset to the initial form instead of leaving the UI stuck on
      // "starting" with nothing happening.
      setSessionError(err.message || 'unknown')
      setHasStarted(false)
    }
  }, [situation, meetingType, selectedIds, isIdle, convene, lang, hasContext, buildContextBlock, buildSituationBrief, ctxProcessing])

  const handleReset = () => {
    setHasStarted(false)
    setSituation('')
    setSubmittedSituation('')
    setReportOpen(false)
  }

  const handleGenerateReport = useCallback(async () => {
    setReportOpen(true)
    await generateReport({ situation: submittedSituation || situation, meetingType, turns, verdict, language: lang })
  }, [submittedSituation, situation, meetingType, turns, verdict, lang, generateReport])

  const handleSendChairman = useCallback((text) => {
    sendChairmanMessage(text, { situation: submittedSituation || situation, turns, verdict, language: lang })
  }, [submittedSituation, situation, turns, verdict, lang, sendChairmanMessage])

  // Extrae el voto de un director del texto generado
  const getDirectorVote = (dirId) => {
    const state = directorStates[dirId]
    if (!state?.text) return null
    const lines = state.text.split('\n').filter(l => l.trim())
    const keywords = ['voto:', 'posición:', 'evaluación:', 'veredicto:', 'vote:', 'position:', 'assessment:', 'verdict:']
    for (const line of lines.slice(-5)) {
      if (keywords.some(k => line.toLowerCase().includes(k))) return line.trim()
    }
    return null
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,13,31,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--bd)',
        padding: '0 28px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--blue-dim)', border: '1px solid var(--blue-bd)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🏛️</div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-.01em' }}>Junta Directiva</span>
          <span style={{ fontSize: '11px', color: 'var(--t3)', marginLeft: '2px' }}>AI Board</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isRunning && (
            <span style={{ fontSize: '12px', color: 'var(--blue)', padding: '4px 12px', borderRadius: '20px', background: 'var(--blue-dim)', border: '1px solid var(--blue-bd)' }}>
              {status === 'starting' ? t('nav.starting') : `${paused ? t('status.paused') : t('nav.debate')} · ${doneCount}/${totalCount}`}
            </span>
          )}
          {status === 'running' && (
            <button
              onClick={paused ? resume : pause}
              title={paused ? t('action.resume') : t('action.pause')}
              style={{ padding: '6px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)', color: 'var(--t3)', fontSize: '13px' }}
            >
              {paused ? '▶️' : '⏸️'}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
            <button
              onClick={() => setLang('en')}
              title="English"
              style={{ padding: '6px 9px', fontSize: '11px', fontWeight: 600, border: 'none', background: lang === 'en' ? 'var(--blue-dim)' : 'transparent', color: lang === 'en' ? 'var(--blue)' : 'var(--t3)' }}
            >
              EN
            </button>
            <button
              onClick={() => setLang('es')}
              title="Español"
              style={{ padding: '6px 9px', fontSize: '11px', fontWeight: 600, border: 'none', background: lang === 'es' ? 'var(--blue-dim)' : 'transparent', color: lang === 'es' ? 'var(--blue)' : 'var(--t3)' }}
            >
              ES
            </button>
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, maxWidth: '860px', margin: '0 auto', padding: '52px 24px 64px', width: '100%' }}>

        {/* ── PANTALLA INICIAL ── */}
        {isIdle && (
          <>
            {/* El resumen abre la página como en la versión de producto, pero deja
                explícito que toda la experiencia del hackathon está disponible
                gratuitamente: no introduce un pago ni un flujo alternativo. */}
            <section className="board-overview fade-up" aria-labelledby="overview-title">
              <div className="board-overview__intro">
                <p className="eyebrow">{t('overview.kicker')}</p>
                <h2 id="overview-title">{t('overview.title')}</h2>
              </div>
              <ol className="board-overview__steps">
                <li>
                  <span>01</span>
                  <div><strong>{t('overview.stepOne')}</strong><p>{t('overview.stepOneDesc')}</p></div>
                </li>
                <li>
                  <span>02</span>
                  <div><strong>{t('overview.stepTwo')}</strong><p>{t('overview.stepTwoDesc')}</p></div>
                </li>
              </ol>
            </section>

            {/* Hero */}
            <div className="board-hero fade-up" style={{ marginBottom: '52px', animationDelay: '.06s' }}>
              <p style={{ fontSize: '11px', color: 'var(--blue)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
                {t('hero.kicker')}
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 400, lineHeight: 1.1, marginBottom: '18px', color: 'var(--t1)' }}>
                {t('board.title')}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--t2)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                {t('board.subtitle')}
              </p>
            </div>

            {/* El elenco — pills seleccionables: quién participa en esta sesión (Task 16:
                selección de directores con defaults inteligentes por tipo de reunión). */}
            <div className="fade-up" style={{ marginBottom: '48px', animationDelay: '.08s' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', fontWeight: 500 }}>
                {t('board.chooseParticipants')} · {selectedIds.length} {t('board.ofDirectors').replace('{total}', DIRECTORS.length)}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {DIRECTORS.map(d => {
                  const isOn = selectedIds.includes(d.id)
                  const isJottarina = d.id === 'jottarina'
                  const activeBorder = isJottarina ? 'var(--red-bd)' : 'var(--blue-bd)'
                  const activeColor  = isJottarina ? 'var(--red)' : 'var(--blue)'
                  const activeBg     = isJottarina ? 'var(--red-dim)' : 'var(--blue-dim)'
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDirector(d.id)}
                      title={(isOn ? t('board.removeDirector') : t('board.includeDirector')).replace('{name}', d.name)}
                      aria-pressed={isOn}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '7px 14px', borderRadius: '24px',
                        border: `1px solid ${isOn ? activeBorder : 'var(--bd)'}`,
                        background: isOn ? activeBg : 'rgba(255,255,255,0.03)',
                        color: isOn ? activeColor : 'var(--t3)',
                        opacity: isOn ? 1 : 0.55,
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                        transition: 'all .15s',
                      }}
                    >
                      <span>{d.emoji}</span>
                      <span>{d.name}</span>
                      <span style={{ fontWeight: 400, opacity: .6, fontSize: '11px' }}>· {DIRECTOR_I18N[lang]?.[d.id]?.tags?.[0] ?? d.title}</span>
                      {!isOn && <span style={{ fontSize: '11px' }}>✕</span>}
                    </button>
                  )
                })}
              </div>
              {selectedIds.length > 8 ? (
                <p style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', marginTop: '10px' }}>
                  {t('board.longDebateWarning').replace('{count}', selectedIds.length)}
                </p>
              ) : (
                <p style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', marginTop: '10px' }}>
                  {t('board.sequentialNote')}
                </p>
              )}
            </div>

            {/* Formulario */}
            <div className="fade-up" style={{ animationDelay: '.14s', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-xl)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 500 }}>{t('form.meetingType')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {MEETING_TYPES.map(mt => (
                    <button key={mt.id} onClick={() => handleMeetingTypeChange(mt.id)} aria-pressed={meetingType === mt.id}
                      style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', textAlign: 'left', border: `1px solid ${meetingType === mt.id ? 'var(--blue-bd)' : 'var(--bd)'}`, background: meetingType === mt.id ? 'var(--blue-dim)' : 'var(--bg3)', transition: 'all .2s' }}>
                      <div style={{ fontSize: '16px', marginBottom: '4px' }}>{mt.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: meetingType === mt.id ? 'var(--blue)' : 'var(--t1)', marginBottom: '2px' }}>{MEETING_TYPE_KEYS[mt.id] ? t(MEETING_TYPE_KEYS[mt.id]) : mt.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{MEETING_DESC_I18N[lang]?.[mt.id] ?? mt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="board-situation" style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500 }}>{t('form.situationLabel')}</label>
                <textarea
                  id="board-situation"
                  value={situation}
                  onChange={e => setSituation(e.target.value.slice(0, MAX_CHARS))}
                  placeholder={t('form.situationPlaceholder')}
                  rows={5}
                  style={{ width: '100%', padding: '16px', background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 'var(--r-md)', color: 'var(--t1)', fontSize: '15px', lineHeight: 1.7, resize: 'vertical', outline: 'none', transition: 'border-color .2s', minHeight: '130px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-bd)'}
                  onBlur={e => e.target.style.borderColor = 'var(--bd)'}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleConvene() }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{t('form.cmdEnterHint')}</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{situation.length}/{MAX_CHARS}</span>
                </div>
                <div className="situation-examples" aria-label={t('form.examplesLabel')}>
                  <span>{t('form.examplesLabel')}</span>
                  {EXAMPLE_KEYS.map(key => (
                    <button key={key} type="button" onClick={() => setSituation(t(key))}>{t(key)}</button>
                  ))}
                </div>
              </div>

              {/* Contexto adicional (Task 17): PDF/Word, URL o nota que se resume
                  y se pliega en `situation` al convocar — ver handleConvene. */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <p style={{ fontSize:'11px', color:'var(--t3)', letterSpacing:'.08em', textTransform:'uppercase', fontWeight:500 }}>
                    {t('context.label')}
                    <span style={{ marginLeft:'6px', fontSize:'10px', padding:'2px 7px', borderRadius:'4px', background:'var(--blue-dim)', color:'var(--blue)', border:'1px solid var(--blue-bd)' }}>
                      {t('context.optional')}
                    </span>
                  </p>
                  {hasContext && (
                    <span style={{ fontSize:'11px', color:'var(--blue)' }}>
                      {ctxItems.filter(i => i.status === 'done').length} {ctxItems.filter(i => i.status === 'done').length !== 1 ? t('context.sourcesReadyPlural') : t('context.sourcesReady')}
                    </span>
                  )}
                </div>
                <ContextPanel
                  items={ctxItems}
                  onProcessFile={(f) => processCtxFile(f, lang)}
                  onProcessURL={(url) => processCtxURL(url, lang)}
                  onAddNote={(text) => addCtxNote(text, lang)}
                  onRemove={removeCtxItem}
                  isProcessing={ctxProcessing}
                />
              </div>

              {sessionError && (
                <div style={{ padding: '14px 18px', background: 'var(--red-dim)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r-md)', color: 'var(--red)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <span>⚠️ {t('errors.genericSessionError')}</span>
                </div>
              )}

              <button
                onClick={handleConvene}
                disabled={(!situation.trim() && !hasContext) || selectedIds.length === 0 || ctxProcessing}
                style={{ padding: '17px', borderRadius: 'var(--r-md)', border: 'none', background: ((situation.trim() || hasContext) && selectedIds.length > 0) ? 'var(--blue)' : 'var(--bg3)', color: ((situation.trim() || hasContext) && selectedIds.length > 0) ? 'var(--bg0)' : 'var(--t3)', fontSize: '15px', fontWeight: 700, cursor: ((situation.trim() || hasContext) && selectedIds.length > 0) ? 'pointer' : 'not-allowed', transition: 'all .2s', letterSpacing: '.02em' }}
              >
                {selectedIds.length === 0 ? t('form.chooseAtLeastOne') : `🏛️ ${t('action.convene')}`}
              </button>
            </div>
          </>
        )}

        {/* ── DEBATE / RESULTADOS ── */}
        {(isRunning || isDone) && (
          <div>
            {/* Header sesión */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: 'var(--blue)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
                  {status === 'starting' ? t('status.starting') : isDone ? t('status.done') : `${paused ? t('status.paused') : t('status.running')} · ${doneCount}/${totalCount}`}
                </p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 400, color: 'var(--t1)', lineHeight: 1.3, maxWidth: '580px', fontStyle: 'italic' }}>
                  "{situation.slice(0, 110)}{situation.length > 110 ? '…' : ''}"
                </h2>
              </div>
              {isDone && (
                <button onClick={handleReset} style={{ padding: '9px 18px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)', color: 'var(--t2)', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {t('action.newSessionShort')}
                </button>
              )}
            </div>

            {/* Conversación de la junta */}
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '18px', fontWeight: 500 }}>
                {t('board.conversationLabel')}
              </p>
              <DebateChat turns={turns} onClickDirector={setSelectedDirector} paused={paused} />
            </div>

            {/* Veredicto — la conclusión, al final de la conversación */}
            {(verdict || (isRunning && doneCount === totalCount)) && (
              <div style={{ marginBottom: '28px' }}>
                <VerdictPanel text={verdict} loading={status === 'running' && !verdict} consensus={isDone ? consensus : null} />
              </div>
            )}

            {isDone && (
              <div style={{ marginBottom: '28px' }}>
                <DownloadBanner
                  sessionData={{ directorCount: doneCount }}
                  loading={reportLoading}
                  onGenerate={handleGenerateReport}
                />
              </div>
            )}

            {isDone && (
              <ChairmanChat
                messages={chairmanMessages}
                sending={chairmanSending}
                error={chairmanError}
                onSend={handleSendChairman}
              />
            )}

            {isDone && (
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button onClick={handleReset} style={{ padding: '13px 32px', borderRadius: 'var(--r-md)', border: '1px solid var(--blue-bd)', background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  🏛️ {t('action.newSession')}
                </button>
              </div>
            )}
          </div>
        )}

        <DirectorsRoster directors={DIRECTORS} onClickDirector={setSelectedDirector} />

        <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--t3)' }}>{t('footer.tagline')}</p>
        </footer>
      </main>

      {/* Modals */}
      {selectedDirector && (
        <DirectorModal
          director={selectedDirector}
          sessionVote={getDirectorVote(selectedDirector.id)}
          onClose={() => setSelectedDirector(null)}
        />
      )}

      {reportOpen && (
        <ReportModal
          situation={submittedSituation || situation}
          verdict={verdict}
          report={report}
          loading={reportLoading}
          error={reportError}
          onClose={() => setReportOpen(false)}
        />
      )}

    </div>
  )
}
