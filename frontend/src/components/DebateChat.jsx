import React, { useEffect, useMemo, useState } from 'react'
import { classifyVote } from '../lib/consensus.js'
import { DIRECTORS } from '../lib/directors.js'
import { useI18n } from '../lib/i18n.js'

const VOTE_BADGE = {
  favor: { icon: '✓', label: 'A favor' },
  contra: { icon: '✗', label: 'En contra' },
  mixto: { icon: '~', label: 'Con matices' },
}

function Bubble({ director, text, kind, onClick, t }) {
  const { color, colorDim, colorBorder } = director
  const vote = kind === 'contrast' ? null : classifyVote(director.id, text)
  const badge = vote ? VOTE_BADGE[vote] : null
  return (
    <div className="slide-in" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <button onClick={onClick} title={`Ver perfil de ${director.name}`} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: colorDim, border: `1px solid ${colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{director.emoji}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <button onClick={onClick} style={{ fontSize: '13px', fontWeight: 700, color }}>{director.name}</button>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{kind === 'contrast' ? t('debate.contrastLabel') : director.title}</span>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: '3px 14px 14px 14px', background: colorDim, border: `1px solid ${colorBorder}`, maxWidth: '620px' }}>
          {text.split('\n').filter(line => line.trim()).map((paragraph, index) => <p key={index} style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'var(--t1)', marginBottom: '8px' }}>{paragraph}</p>)}
        </div>
        {badge && <p style={{ fontSize: '11px', color, marginTop: '6px', fontWeight: 600 }}>{badge.icon} {badge.label}</p>}
      </div>
    </div>
  )
}

function elapsedSince(isoDate, now) {
  const started = Date.parse(isoDate || '')
  if (Number.isNaN(started)) return null
  const seconds = Math.max(0, Math.floor((now - started) / 1000))
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60}s` : `${seconds}s`
}

function stateText(state, t) {
  return t(`debate.director.${state || 'waiting'}`)
}

// The visual board mirrors persisted backend states. Its animation is a view
// of actual Gemini work, not a simulated loading sequence.
export default function DebateChat({ turns, onClickDirector, paused, selectedDirectorIds, progress }) {
  const { t } = useI18n()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const participants = useMemo(() => DIRECTORS.filter(director => !selectedDirectorIds?.length || selectedDirectorIds.includes(director.id)), [selectedDirectorIds])
  const states = progress?.directorProgress || {}
  const completed = new Set(turns.filter(turn => turn.kind !== 'contrast').map(turn => turn.director_id)).size
  const total = progress?.totalSteps || participants.length
  const elapsed = elapsedSince(progress?.createdAt, now)
  const phase = progress?.phase || 'preparing'
  const phaseText = paused
    ? `⏸️ ${t('status.paused')}`
    : t(`debate.phase.${phase}`)

  return (
    <div>
      <section aria-label={t('debate.liveBoard')} style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--blue-bd)', borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, var(--blue-dim), rgba(255,255,255,0.02))' }}>
        <div role="status" aria-live="polite" aria-atomic="true" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '13px' }}>
          <span style={{ color: 'var(--t1)', fontSize: '13px', fontWeight: 700 }}>{phaseText}</span>
          <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{t('debate.progress').replace('{current}', String(completed)).replace('{total}', String(total))}{elapsed ? ` · ${t('debate.elapsed').replace('{time}', elapsed)}` : ''}</span>
        </div>
        <div role="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: '8px' }}>
          {participants.map(director => {
            const state = states[director.id] || 'waiting'
            const busy = ['analyzing', 'contrasting'].includes(state) && !paused
            const ready = state === 'ready'
            return (
              <button key={director.id} role="listitem" onClick={() => onClickDirector(director)} title={`${director.name} · ${stateText(state, t)}`} style={{ textAlign: 'left', padding: '8px', borderRadius: '8px', border: `1px solid ${busy ? director.colorBorder : ready ? 'var(--blue-bd)' : 'var(--bd)'}`, background: busy ? director.colorDim : ready ? 'var(--blue-dim)' : 'rgba(255,255,255,0.025)', opacity: state === 'waiting' ? .62 : 1, transition: 'transform .2s, background .2s', transform: busy ? 'translateY(-1px)' : 'none', animation: busy ? 'pulse 1.6s ease infinite' : 'none' }}>
                <span aria-hidden="true" style={{ fontSize: '16px', marginRight: '6px' }}>{director.emoji}</span>
                <span style={{ fontSize: '11px', color: busy ? director.color : 'var(--t2)', fontWeight: 700 }}>{director.name.split(' ')[0]}</span>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '10px', color: 'var(--t3)' }}>{stateText(state, t)}</span>
              </button>
            )
          })}
        </div>
      </section>

      {turns.map((turn, index) => {
        const director = DIRECTORS.find(item => item.id === turn.director_id)
        return director ? <Bubble key={`${turn.director_id}-${turn.kind || 'analysis'}-${index}`} director={director} text={turn.text} kind={turn.kind} t={t} onClick={() => onClickDirector(director)} /> : null
      })}
    </div>
  )
}
