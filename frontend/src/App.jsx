import React, { useState, useCallback, useMemo } from 'react'
import DebateChat from './components/DebateChat.jsx'
import DirectorModal from './components/DirectorModal.jsx'
import DirectorsRoster from './components/DirectorsRoster.jsx'
import VerdictPanel from './components/VerdictPanel.jsx'
import DownloadBanner from './components/DownloadBanner.jsx'
import ReportModal from './components/ReportModal.jsx'
import ChairmanChat from './components/ChairmanChat.jsx'
import { useBoard } from './hooks/useBoard.js'
import { useContextBuilder } from './hooks/useContext.js'
import { useReport } from './hooks/useReport.js'
import { useChairmanChat } from './hooks/useChairmanChat.js'
import ContextPanel from './components/ContextPanel.jsx'
import { DIRECTORS, MEETING_TYPES } from './lib/directors.js'
import { computeConsensus } from './lib/consensus.js'
import { I18nProvider, useI18n } from './lib/i18n.js'

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
  const [meetingType, setMeetingType] = useState('decision')
  const [selectedDirector, setSelectedDirector] = useState(null)

  // El backend (backend/orchestrator.py) siempre convoca a los 12 directores en su orden
  // fijo — ya no hay selección de directores ni API key de cliente (Vertex AI se autentica
  // server-side vía la service account de Cloud Run). El hook tampoco expone un `reset`,
  // así que "sesión iniciada" se rastrea localmente: sirve tanto para mostrar la pantalla
  // inicial de nuevo tras "Nueva sesión" como para el estado idle antes del primer convene.
  const { turns, verdict, status, convene } = useBoard()
  const [hasStarted, setHasStarted] = useState(false)
  const { items: ctxItems, addNote, processFile, processURL, removeItem: removeCtxItem,
          hasContext, isProcessing: ctxProcessing } = useContextBuilder()
  const { report, loading: reportLoading, error: reportError, generateReport, reset: resetReport } = useReport()
  const [showReport, setShowReport] = useState(false)
  const { messages: chatMessages, sending: chatSending, error: chatError, freeMessagesUsed, sendMessage: sendChatMessage, reset: resetChat } = useChairmanChat()

  // computeConsensus (lib/consensus.js) espera un mapa { [directorId]: { status, text } };
  // se deriva de `turns` en vez de tocar esa función, ya que solo se le pasan directores
  // que ya completaron su turno.
  const directorStates = useMemo(
    () => Object.fromEntries(turns.map(t => [t.director_id, { status: 'done', text: t.text }])),
    [turns]
  )
  const consensus = useMemo(() => computeConsensus(directorStates), [directorStates])

  const handleGenerateReport = () => {
    setShowReport(true)
    generateReport({ situation, meetingType, turns, verdict, apiKey: null })
  }

  const handleSendChat = (text) => {
    sendChatMessage(text, { situation, turns, verdict }, { apiKey: null })
  }

  const handleMeetingTypeChange = (id) => {
    setMeetingType(id)
  }

  const isIdle    = !hasStarted
  const isRunning = hasStarted && status !== 'done'
  const isDone    = hasStarted && status === 'done'

  const doneCount  = turns.length
  const totalCount = DIRECTORS.length

  const handleConvene = useCallback(async () => {
    if (!situation.trim() || !isIdle) return
    setHasStarted(true)
    await convene(situation.trim(), meetingType)
  }, [situation, meetingType, isIdle, convene])

  const handleReset = () => {
    setHasStarted(false)
    resetReport()
    resetChat()
    setShowReport(false)
    setSituation('')
  }

  // Extrae el voto de un director del texto generado
  const getDirectorVote = (dirId) => {
    const state = directorStates[dirId]
    if (!state?.text) return null
    const lines = state.text.split('\n').filter(l => l.trim())
    const keywords = ['voto:', 'posición:', 'evaluación:', 'veredicto:']
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
              {status === 'starting' ? 'Convocando...' : `Debate · ${doneCount}/${totalCount}`}
            </span>
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
            {/* Hero */}
            <div className="fade-up" style={{ textAlign: 'center', marginBottom: '52px' }}>
              <p style={{ fontSize: '11px', color: 'var(--blue)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
                Tu junta directiva · 12 expertos
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 400, lineHeight: 1.1, marginBottom: '18px', color: 'var(--t1)' }}>
                {t('board.title')}
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--t2)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                {t('board.subtitle')}
              </p>
            </div>

            {/* El elenco — informativo: los 12 directores siempre participan (el orquestador
                del backend corre la lista completa en orden fijo, no hay selección). */}
            <div className="fade-up" style={{ marginBottom: '48px', animationDelay: '.08s' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', fontWeight: 500 }}>
                Tu junta · {DIRECTORS.length} directores
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {DIRECTORS.map(d => {
                  const isJottarina = d.id === 'jottarina'
                  const activeBorder = isJottarina ? 'var(--red-bd)' : 'var(--blue-bd)'
                  const activeColor  = isJottarina ? 'var(--red)' : 'var(--blue)'
                  const activeBg     = isJottarina ? 'var(--red-dim)' : 'var(--blue-dim)'
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDirector(d)}
                      title={`Ver perfil de ${d.name}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '7px 14px', borderRadius: '24px',
                        border: `1px solid ${activeBorder}`,
                        background: activeBg,
                        color: activeColor,
                        cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                        transition: 'all .15s',
                      }}
                    >
                      <span>{d.emoji}</span>
                      <span>{d.name}</span>
                      <span style={{ fontWeight: 400, opacity: .6, fontSize: '11px' }}>· {d.title.split(' ').slice(-1)[0]}</span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', marginTop: '10px' }}>
                El debate es secuencial (cada director escucha a los anteriores) — puede tardar varios minutos.
              </p>
            </div>

            {/* Formulario */}
            <div className="fade-up" style={{ animationDelay: '.14s', background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-xl)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 500 }}>Tipo de reunión</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {MEETING_TYPES.map(mt => (
                    <button key={mt.id} onClick={() => handleMeetingTypeChange(mt.id)}
                      style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', textAlign: 'left', border: `1px solid ${meetingType === mt.id ? 'var(--blue-bd)' : 'var(--bd)'}`, background: meetingType === mt.id ? 'var(--blue-dim)' : 'var(--bg3)', transition: 'all .2s' }}>
                      <div style={{ fontSize: '16px', marginBottom: '4px' }}>{mt.icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: meetingType === mt.id ? 'var(--blue)' : 'var(--t1)', marginBottom: '2px' }}>{MEETING_TYPE_KEYS[mt.id] ? t(MEETING_TYPE_KEYS[mt.id]) : mt.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{mt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 500 }}>Situación a debatir</p>
                <textarea
                  value={situation}
                  onChange={e => setSituation(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Describe la situación con contexto. Cuánto más específico seas, más útil será el análisis. Incluye datos relevantes: mercado, recursos, restricciones, plazos..."
                  rows={5}
                  style={{ width: '100%', padding: '16px', background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 'var(--r-md)', color: 'var(--t1)', fontSize: '15px', lineHeight: 1.7, resize: 'vertical', outline: 'none', transition: 'border-color .2s', minHeight: '130px' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-bd)'}
                  onBlur={e => e.target.style.borderColor = 'var(--bd)'}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleConvene() }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>⌘+Enter para convocar</span>
                  <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{situation.length}/{MAX_CHARS}</span>
                </div>
              </div>

              {/* Panel de contexto enriquecido */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                  <p style={{ fontSize:'11px', color:'var(--t3)', letterSpacing:'.08em', textTransform:'uppercase', fontWeight:500 }}>
                    Contexto adicional
                    <span style={{ marginLeft:'6px', fontSize:'10px', padding:'2px 7px', borderRadius:'4px', background:'var(--blue-dim)', color:'var(--blue)', border:'1px solid var(--blue-bd)' }}>
                      Opcional
                    </span>
                  </p>
                  {hasContext && (
                    <span style={{ fontSize:'11px', color:'var(--blue)' }}>
                      {ctxItems.filter(i=>i.status==='done').length} fuente{ctxItems.filter(i=>i.status==='done').length!==1?'s':''} lista{ctxItems.filter(i=>i.status==='done').length!==1?'s':''}
                    </span>
                  )}
                </div>
                <ContextPanel
                  items={ctxItems}
                  onProcessFile={(f) => processFile(f, null)}
                  onProcessURL={(url) => processURL(url, null)}
                  onAddNote={(text) => addNote(text, null)}
                  onRemove={removeCtxItem}
                  isProcessing={ctxProcessing}
                />
              </div>

              <button
                onClick={handleConvene}
                disabled={!situation.trim() || ctxProcessing}
                style={{ padding: '17px', borderRadius: 'var(--r-md)', border: 'none', background: situation.trim() ? 'var(--blue)' : 'var(--bg3)', color: situation.trim() ? 'var(--bg0)' : 'var(--t3)', fontSize: '15px', fontWeight: 700, cursor: situation.trim() ? 'pointer' : 'not-allowed', transition: 'all .2s', letterSpacing: '.02em' }}
              >
                🏛️ {t('action.convene')}
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
                  {status === 'starting' ? 'Convocando junta...' : isDone ? 'Sesión completada' : `Debate en curso · ${doneCount}/${totalCount}`}
                </p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 400, color: 'var(--t1)', lineHeight: 1.3, maxWidth: '580px', fontStyle: 'italic' }}>
                  "{situation.slice(0, 110)}{situation.length > 110 ? '…' : ''}"
                </h2>
              </div>
              {isDone && (
                <button onClick={handleReset} style={{ padding: '9px 18px', borderRadius: 'var(--r-sm)', border: '1px solid var(--bd)', color: 'var(--t2)', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Nueva sesión
                </button>
              )}
            </div>

            {/* Conversación de la junta */}
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '18px', fontWeight: 500 }}>
                La conversación · clic en un director para ver su perfil
              </p>
              <DebateChat turns={turns} onClickDirector={setSelectedDirector} />
            </div>

            {/* Veredicto — la conclusión, al final de la conversación */}
            {(verdict || (isRunning && doneCount === totalCount)) && (
              <div style={{ marginBottom: '28px' }}>
                <VerdictPanel text={verdict} loading={status === 'running' && !verdict} consensus={isDone ? consensus : null} />
              </div>
            )}

            {/* Banner informe completo — aparece cuando hay veredicto */}
            {isDone && verdict && (
              <div style={{ marginBottom: '28px' }}>
                <DownloadBanner
                  sessionData={{ directorCount: turns.length }}
                  loading={reportLoading}
                  onGenerate={handleGenerateReport}
                />
              </div>
            )}

            {/* Chat de seguimiento con el Chairman — después del veredicto */}
            {isDone && verdict && (
              <ChairmanChat
                messages={chatMessages}
                sending={chatSending}
                error={chatError}
                freeMessagesUsed={freeMessagesUsed}
                hasKey={false}
                onSend={handleSendChat}
                onOpenSettings={() => {}}
              />
            )}

            {isDone && (
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button onClick={handleReset} style={{ padding: '13px 32px', borderRadius: 'var(--r-md)', border: '1px solid var(--blue-bd)', background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  🏛️ Nueva sesión de junta
                </button>
              </div>
            )}
          </div>
        )}

        <DirectorsRoster directors={DIRECTORS} onClickDirector={setSelectedDirector} />

        <footer style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--bd)', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: 'var(--t3)' }}>Junta Directiva AI · 12 expertos · Powered by Gemini · 2026</p>
        </footer>
      </main>

      {/* Modals */}
      {showReport && (
        <ReportModal
          situation={situation}
          verdict={verdict}
          report={report}
          loading={reportLoading}
          error={reportError}
          onClose={() => setShowReport(false)}
        />
      )}
      {selectedDirector && (
        <DirectorModal
          director={selectedDirector}
          sessionVote={getDirectorVote(selectedDirector.id)}
          onClose={() => setSelectedDirector(null)}
        />
      )}
    </div>
  )
}
