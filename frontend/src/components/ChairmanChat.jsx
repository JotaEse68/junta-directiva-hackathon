import React, { useState } from 'react'
import { useI18n } from '../lib/i18n.js'
import { prepareChatAttachment } from '../lib/chatAttachments.js'
import { downloadChairmanReplyPdf } from '../lib/reportPdf.js'

export default function ChairmanChat({ messages, sending, error, onSend, situation }) {
  const { t, lang } = useI18n()
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [attachmentError, setAttachmentError] = useState(null)
  const displayError = error

  const canSend = (input.trim() || attachment) && !sending

  const handleSend = () => {
    if (!canSend) return
    onSend(input || t('chairman.attachmentQuestion'), attachment ? [attachment] : [])
    setInput('')
    setAttachment(null)
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
                {m.role === 'assistant' && m.content && (
                  <button onClick={() => downloadChairmanReplyPdf({ situation, reply: m.content, language: lang })} style={{ marginTop: '9px', padding: '6px 9px', borderRadius: '6px', border: '1px solid var(--blue-bd)', background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '11px', fontWeight: 700 }}>
                    {t('chairman.downloadPdf')}
                  </button>
                )}
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

      {attachmentError && <div style={{ margin: '0 22px', color: 'var(--red)', fontSize: '12px' }}>⚠️ {attachmentError}</div>}

      <div style={{ padding: '16px 22px' }}>
        {attachment && <div style={{ marginBottom: '8px', display: 'inline-flex', gap: '7px', alignItems: 'center', padding: '6px 9px', border: '1px solid var(--blue-bd)', borderRadius: '7px', background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '11px' }}>📎 {attachment.name}<button onClick={() => setAttachment(null)} aria-label="Quitar adjunto" style={{ color: 'var(--blue)', fontSize: '15px' }}>×</button></div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <label title={t('chairman.attach')} style={{ padding: '10px 11px', border: '1px solid var(--bd)', borderRadius: 'var(--r-sm)', color: 'var(--t2)', cursor: sending ? 'not-allowed' : 'pointer' }}>
            📎
            <input type="file" accept="image/*,.pdf,.md,.txt" disabled={sending} style={{ display: 'none' }} onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { setAttachmentError(null); setAttachment(await prepareChatAttachment(file)) } catch (err) { setAttachmentError(err.message) } }} />
          </label>
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
