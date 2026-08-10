import React from 'react'
import { useI18n } from '../lib/i18n.js'

export default function DownloadBanner({ sessionData, loading, onGenerate }) {
  const { t } = useI18n()

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--blue-bd)',
      borderRadius: 'var(--r-xl)',
      padding: '22px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>📄</span>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{t('report.bannerTitle')}</p>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>
          {t('report.bannerDesc').replace('{count}', sessionData?.directorCount || 12)}
        </p>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        style={{
          padding: '11px 22px',
          borderRadius: 'var(--r-md)',
          background: loading ? 'var(--bg3)' : 'var(--blue)',
          color: loading ? 'var(--t2)' : 'var(--bg0)',
          fontSize: '13px', fontWeight: 700,
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all .2s',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {loading ? t('report.generating') : t('report.viewButton')}
      </button>
    </div>
  )
}
