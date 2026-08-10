import React from 'react'
import { classifyVote } from '../lib/consensus.js'
import { DIRECTORS } from '../lib/directors.js'
import { useI18n } from '../lib/i18n.js'

const VOTE_BADGE = {
  favor:  { icon: '✓', label: 'A favor' },
  contra: { icon: '✗', label: 'En contra' },
  mixto:  { icon: '~', label: 'Con matices' },
}

function Bubble({ director, text, onClick }) {
  const { color, colorDim, colorBorder } = director
  const vote = classifyVote(director.id, text)
  const badge = vote ? VOTE_BADGE[vote] : null

  return (
    <div className="slide-in" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <button
        onClick={onClick}
        title={`Ver perfil de ${director.name}`}
        style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: colorDim, border: `1px solid ${colorBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}
      >
        {director.emoji}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <button onClick={onClick} style={{ fontSize: '13px', fontWeight: 700, color }}>{director.name}</button>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{director.title}</span>
        </div>

        <div style={{
          padding: '12px 16px', borderRadius: '3px 14px 14px 14px',
          background: colorDim,
          border: `1px solid ${colorBorder}`,
          maxWidth: '620px',
        }}>
          {text.split('\n').filter(l => l.trim()).map((p, i) => (
            <p key={i} style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'var(--t1)', marginBottom: '8px' }}>{p}</p>
          ))}
        </div>

        {badge && (
          <p style={{ fontSize: '11px', color, marginTop: '6px', fontWeight: 600 }}>{badge.icon} {badge.label}</p>
        )}
      </div>
    </div>
  )
}

// turns: [{ director_id, text }], una entrada por director conforme va llegando desde
// Firestore (backend/orchestrator.py corre siempre los 12 directores en orden fijo).
// Los metadatos de presentación (nombre, emoji, colores...) se resuelven contra
// lib/directors.js por director_id — el turn en sí solo trae id + texto.
export default function DebateChat({ turns, onClickDirector, paused }) {
  const { t } = useI18n()
  const doneIds = new Set(turns.map(turn => turn.director_id))
  const pending = DIRECTORS.filter(d => !doneIds.has(d.id))
  // The backend always processes directors sequentially, in DIRECTORS order (filtered
  // by selection) — so the first still-pending director is the one being generated
  // right now, and the rest are genuinely just waiting their turn.
  const [active, ...stillQueued] = pending

  return (
    <div>
      {turns.map((turn, i) => {
        const director = DIRECTORS.find(d => d.id === turn.director_id)
        if (!director) return null
        return (
          <Bubble key={`${turn.director_id}-${i}`} director={director} text={turn.text} onClick={() => onClickDirector(director)} />
        )
      })}

      {active && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
          <span
            title={active.name}
            style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              opacity: paused ? .5 : 1,
              background: active.colorDim, border: `1px solid ${active.colorBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              animation: paused ? 'none' : 'pulse 1.6s ease infinite',
            }}
          >
            {active.emoji}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {paused ? (
              `⏸️ ${t('status.paused')}`
            ) : (
              <>
                {t('debate.isAnalyzing').replace('{name}', active.name)}
                <span style={{ display: 'inline-flex', gap: '3px' }}>
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                </span>
              </>
            )}
          </span>
        </div>
      )}

      {stillQueued.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '8px 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{t('debate.queue')}</span>
          {stillQueued.map(d => (
            <span
              key={d.id}
              title={d.name}
              style={{
                width: '26px', height: '26px', borderRadius: '50%', opacity: .5,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
              }}
            >
              {d.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
