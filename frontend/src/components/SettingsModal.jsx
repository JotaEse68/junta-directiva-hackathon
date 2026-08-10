import React, { useState } from 'react'
import { useI18n } from '../lib/i18n.js'

// COMPETITION BUILD (Task 20): Gemini-only "bring your own API key" modal.
// Production version (github.com/JotaEse68/juntadirectiva) offered Claude/OpenAI/
// Gemini as BYOK choices — deliberately narrowed to Gemini-only here, since the
// hackathon submission's compliance requirement is Gemini exclusively; adding the
// other providers back would violate that for this repo.
export default function SettingsModal({ onClose, onSave, currentKey }) {
  const { t } = useI18n()
  const [key, setKey] = useState(currentKey || '')
  const [visible, setVisible] = useState(false)

  const hasKey = !!key.trim()
  const isFreeMode = !currentKey

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(6,13,31,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:'20px',animation:'fadeIn .2s ease' }}
      onClick={e => e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'var(--bg1)',border:'1px solid var(--blue-bd)',borderRadius:'var(--r-xl)',padding:'32px',width:'100%',maxWidth:'440px',animation:'fadeUp .3s ease' }}>
        <h2 style={{ fontSize:'18px',fontWeight:700,marginBottom:'6px',color:'var(--t1)' }}>{t('settings.title')}</h2>
        <p style={{ fontSize:'13px',color:'var(--t2)',marginBottom:'24px',lineHeight:1.5 }}>{t('settings.subtitle')}</p>

        <div style={{ padding:'16px',borderRadius:'var(--r-md)',border:`1px solid ${isFreeMode?'var(--blue-bd)':'var(--bd)'}`,background:isFreeMode?'var(--blue-dim)':'transparent',marginBottom:'10px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px' }}>
            <span>🌐</span>
            <span style={{ fontSize:'14px',fontWeight:600,color:isFreeMode?'var(--blue)':'var(--t1)' }}>{t('settings.freeModeTitle')}</span>
            {isFreeMode&&<span style={{ fontSize:'10px',padding:'2px 7px',borderRadius:'4px',background:'var(--blue-dim)',color:'var(--blue)',fontWeight:700,border:'1px solid var(--blue-bd)' }}>{t('settings.active')}</span>}
          </div>
          <p style={{ fontSize:'12px',color:'var(--t3)',lineHeight:1.5 }}>{t('settings.freeModeDesc')}</p>
        </div>

        <div style={{ padding:'16px',borderRadius:'var(--r-md)',border:`1px solid ${!isFreeMode?'var(--blue-bd)':'var(--bd)'}`,background:!isFreeMode?'var(--blue-dim)':'transparent',marginBottom:'24px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px' }}>
            <span>🔵</span>
            <span style={{ fontSize:'14px',fontWeight:600,color:!isFreeMode?'var(--blue)':'var(--t1)' }}>{t('settings.byokTitle')}</span>
            {!isFreeMode&&<span style={{ fontSize:'10px',padding:'2px 7px',borderRadius:'4px',background:'var(--blue-dim)',color:'var(--blue)',fontWeight:700,border:'1px solid var(--blue-bd)' }}>{t('settings.active')}</span>}
          </div>

          <p style={{ fontSize:'12px',color:'var(--t3)',lineHeight:1.5,marginBottom:'12px' }}>{t('settings.byokDesc')}</p>

          <div style={{ position:'relative' }}>
            <input type={visible?'text':'password'} value={key} onChange={e=>setKey(e.target.value)} placeholder="AIza..."
              style={{ width:'100%',padding:'10px 40px 10px 12px',background:'var(--bg0)',border:'1px solid var(--bd)',borderRadius:'var(--r-sm)',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'monospace',transition:'border-color .2s' }}
              onFocus={e=>e.target.style.borderColor='var(--blue-bd)'} onBlur={e=>e.target.style.borderColor='var(--bd)'} />
            <button onClick={()=>setVisible(!visible)} style={{ position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'var(--t3)',fontSize:'14px',padding:'4px' }}>
              {visible?'🙈':'👁️'}
            </button>
          </div>
          <p style={{ fontSize:'11px',color:'var(--t3)',marginTop:'6px' }}>
            {t('settings.getKeyAt')}{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color:'var(--blue)',textDecoration:'none' }}>aistudio.google.com/apikey</a>
          </p>
        </div>

        <div style={{ display:'flex',gap:'8px' }}>
          <button onClick={onClose} style={{ flex:1,padding:'11px',borderRadius:'var(--r-sm)',border:'1px solid var(--bd)',color:'var(--t2)',fontSize:'13px' }}>{t('settings.cancel')}</button>
          {!isFreeMode&&<button onClick={()=>{onSave('');onClose()}} style={{ padding:'11px 14px',borderRadius:'var(--r-sm)',border:'1px solid var(--red-bd)',color:'var(--red)',fontSize:'13px' }}>{t('settings.remove')}</button>}
          <button onClick={()=>{onSave(key.trim());onClose()}} style={{ flex:2,padding:'11px',borderRadius:'var(--r-sm)',border:'none',background:'var(--blue)',color:'var(--bg0)',fontSize:'13px',fontWeight:700 }}>
            {hasKey?t('settings.useMyKey'):t('settings.useFreeMode')}
          </button>
        </div>
      </div>
    </div>
  )
}
