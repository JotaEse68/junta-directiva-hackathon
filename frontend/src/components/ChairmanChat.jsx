import React, { useState } from 'react'
import { useI18n } from '../lib/i18n.js'

export default function ChairmanChat({ messages, sending, error, onSend }) {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  // Task 20: map the stable "RATE_LIMIT_EXCEEDED" code (see useChairmanChat.js)
  // through i18n instead of dumping the raw error string.
  const displayError = error === 'RATE_LIMIT_EXCEEDED' ? t('errors.rateLimitExceeded') : error

  const canSend = input.trim() && !sending

  const handleSend = () => {
    if (!canSend) return
    onSend(input)
    setInput('')
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: 'var(--r-xl)', overflow: 'hidden', marginBottom: '28px' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>{t('chairman.title')}</p>
        </div>
      </div>

      {messages.length > 0 && (
        <div style={{ padding: '18px 22px 4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
                background: m.role === 'user' ? 'var(--blue-dim)' : 'var(--bg3)',
                border: `1px solid ${m.role === 'user' ? 'var(--blue-bd)' : 'var(--bd)'}`,
              }}>
                {m.role === 'assistant' && (
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue)', marginBottom: '4px' }}>🏛️ Roberto Alcántara</p>
                )}
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--t1)', whiteSpace: 'pre-wrap' }}>
                  {m.content || (sending && i === messages.length - 1 ? '···' : '')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ margin: '0 22px', padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--red-bd)', borderRadius: 'var(--r-sm)', color: 'var(--red)', fontSize: '12px' }}>
          ⚠️ {displayError}
        </div>
      )}

      <div style={{ padding: '16px 22px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSend) handleSend() }}
            placeholder={t('chairman.placeholder')}
            disabled={sending}
            style={{ flex: 1, padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: '13px', outline: 'none' }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{ padding: '11px 18px', borderRadius: 'var(--r-sm)', border: 'none', background: canSend ? 'var(--blue)' : 'var(--bg3)', color: canSend ? 'var(--bg0)' : 'var(--t3)', fontSize: '13px', fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed' }}
          >
            {sending ? '...' : t('chairman.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
