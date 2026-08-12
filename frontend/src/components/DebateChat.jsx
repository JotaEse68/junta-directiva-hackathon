import React, { useEffect, useMemo, useState } from 'react'
import { classifyVote } from '../lib/consensus.js'
import { DIRECTORS } from '../lib/directors.js'
import { useI18n } from '../lib/i18n.js'

const VOTE_BADGE = {
  favor: { icon: '✓', label: 'A favor' },
  contra: { icon: '✗', label: 'En contra' },
  mixto: { icon: '~', label: 'Con matices' },
}

function Bubble({ director, text, onClick }) {
  const { color, colorDim, colorBorder } = director
  const vote = classifyVote(director.id, text)
  const badge = vote ? VOTE_BADGE[vote] : null

  return (
    <div className="slide-in" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
      <button onClick={onClick} title={`Ver perfil de ${director.name}`} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: colorDim, border: `1px solid ${colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
        {director.emoji}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <button onClick={onClick} style={{ fontSize: '13px', fontWeight: 700, color }}>{director.name}</button>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{director.title}</span>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: '3px 14px 14px 14px', background: colorDim, border: `1px solid ${colorBorder}`, maxWidth: '620px' }}>
          {text.split('\n').filter(line => line.trim()).map((paragraph, index) => (
            <p key={index} style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'var(--t1)', marginBottom: '8px' }}>{paragraph}</p>
          ))}
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
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes} min ${seconds % 60}s` : `${seconds}s`
}

// Turns arrive only after each complete Gemini response. Progress is persisted
// separately by the backend, so the active specialist is visible immediately.
export default function DebateChat({ turns, onClickDirector, paused, selectedDirectorIds, progress }) {
  const { t } = useI18n()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const doneIds = new Set(turns.map(turn => turn.director_id))
  const participants = useMemo(
    () => DIRECTORS.filter(director => !selectedDirectorIds?.length || selectedDirectorIds.includes(director.id)),
    [selectedDirectorIds],
  )
  const pending = participants.filter(director => !doneIds.has(director.id))
  const active = participants.find(director => director.id === progress?.directorId) || pending[0]
  const total = progress?.totalSteps || participants.length
  const step = progress?.step || Math.min(turns.length + 1, total)
  const elapsed = elapsedSince(progress?.createdAt, now)
  const isSynthesizing = progress?.phase === 'synthesizing'
  const activityText = paused
    ? `⏸️ ${t('status.paused')}`
    : isSynthesizing
      ? t('debate.synthesizing')
      : active
        ? t('debate.isAnalyzing').replace('{name}', active.name)
        : t('debate.preparing')

  return (
    <div>
      {turns.map((turn, index) => {
        const director = DIRECTORS.find(item => item.id === turn.director_id)
        return director ? <Bubble key={`${turn.director_id}-${index}`} director={director} text={turn.text} onClick={() => onClickDirector(director)} /> : null
      })}

      {(active || isSynthesizing) && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
          <span title={isSynthesizing ? t('debate.synthesizing') : active?.name} style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, opacity: paused ? .5 : 1, background: isSynthesizing ? 'var(--blue-dim)' : active.colorDim, border: `1px solid ${isSynthesizing ? 'var(--blue-bd)' : active.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', animation: paused ? 'none' : 'pulse 1.6s ease infinite' }}>
            {isSynthesizing ? '⚖️' : active.emoji}
          </span>
          <div style={{ display: 'grid', gap: '4px' }}>
            <span role="status" aria-live="polite" aria-atomic="true" style={{ fontSize: '12px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {activityText}
              {!paused && <span aria-hidden="true" style={{ display: 'inline-flex', gap: '3px' }}><span className="dot"></span><span className="dot"></span><span className="dot"></span></span>}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
              {t('debate.progress').replace('{current}', String(step)).replace('{total}', String(total))}
              {elapsed ? ` · ${t('debate.elapsed').replace('{time}', elapsed)}` : ''}
            </span>
          </div>
        </div>
      )}

      {pending.length > 1 && !isSynthesizing && (
        <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '0', marginBottom: '18px' }}>
          {t('debate.upNext').replace('{count}', String(pending.length - 1))}
        </p>
      )}
    </div>
  )
}
