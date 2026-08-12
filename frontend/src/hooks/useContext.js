import { useState, useCallback } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Extrae texto de PDF usando pdf.js desde CDN
async function extractPDF(file) {
  const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }
  return fullText.slice(0, 8000)
}

// Extrae texto de Word (.docx) usando mammoth desde CDN
async function extractDOCX(file) {
  const mammoth = (await import('https://cdn.jsdelivr.net/npm/mammoth@1.7.0/mammoth.browser.esm.js')).default
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.slice(0, 8000)
}

export function useContextBuilder() {
  const [items, setItems]     = useState([]) // { id, type, name, status, summary, error }
  const [processing, setProcessing] = useState(false)

  const addItem = useCallback((partial) => {
    const id = Date.now() + Math.random()
    const item = { id, status: 'pending', summary: '', error: null, ...partial }
    setItems(prev => [...prev, item])
    return id
  }, [])

  const updateItem = useCallback((id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }, [])

  // Envía al servidor para resumir (Gemini-only en este build —
  // ver backend/main.py POST /context, adaptado del original /api/context)
  const summarizeViaServer = async (type, payload, language) => {
    const body = { type, language: language || 'es', ...payload }
    const res = await fetch(`${BACKEND_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.detail || `Error ${res.status}`)
    return data.summary
  }

  // Procesa un archivo (PDF o Word)
  //
  // Error reporting: item.error holds either a known error CODE (one of the
  // ERROR_CODES below — ContextPanel.jsx maps these through t('context.error'+code)
  // so the message follows the UI's language) or a raw message string from the
  // backend (e.g. "No se pudo acceder a la URL (502)") when there's no matching
  // code to localize — the backend itself is Spanish-only regardless of `language`
  // (see backend/context_utils.py), so those messages aren't translated client-side.
  //
  // Validation failures (wrong extension, oversized file, malformed URL) create a
  // visible error-state item via addItem/updateItem, same as the async failure
  // paths below, instead of only returning a value — callers (ContextPanel.jsx)
  // don't check the return value, so a silently-returned error was previously
  // invisible in the UI (Task 17 review finding).
  const processFile = useCallback(async (file, language) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      addItem({ type: 'file', name: file.name, status: 'error', error: 'FileType' })
      return { error: 'FileType' }
    }
    if (file.size > 20 * 1024 * 1024) {
      addItem({ type: 'file', name: file.name, status: 'error', error: 'FileSize' })
      return { error: 'FileSize' }
    }

    const id = addItem({ type: 'file', name: file.name, status: 'extracting' })

    try {
      // 1. Extraer texto en el cliente
      let extracted = ''
      if (ext === 'pdf') {
        extracted = await extractPDF(file)
      } else {
        extracted = await extractDOCX(file)
      }

      if (!extracted.trim()) {
        updateItem(id, { status: 'error', error: 'ExtractFailed' })
        return
      }

      updateItem(id, { status: 'summarizing' })

      // 2. Resumir via servidor
      const summary = await summarizeViaServer('extracted', { content: extracted }, language)
      updateItem(id, { status: 'done', summary })

    } catch (err) {
      updateItem(id, { status: 'error', error: err.message || 'ProcessingFile' })
    }
  }, [addItem, updateItem])

  // Procesa una URL
  const processURL = useCallback(async (url, language) => {
    if (!url.trim()) return
    try { new URL(url) } catch {
      addItem({ type: 'url', name: url, status: 'error', error: 'InvalidUrl' })
      return { error: 'InvalidUrl' }
    }

    const id = addItem({ type: 'url', name: url, status: 'fetching' })

    try {
      const summary = await summarizeViaServer('url', { url }, language)
      updateItem(id, { status: 'done', summary })
    } catch (err) {
      updateItem(id, { status: 'error', error: err.message || 'UrlFailed' })
    }
  }, [addItem, updateItem])

  // Añade una nota de texto libre
  const addNote = useCallback(async (text, language) => {
    if (!text.trim()) return
    const id = addItem({ type: 'note', name: 'Nota', status: 'summarizing' })
    try {
      // Notas cortas: pasar directas sin resumir
      if (text.length < 600) {
        updateItem(id, { status: 'done', summary: text.trim() })
      } else {
        const summary = await summarizeViaServer('note', { content: text }, language)
        updateItem(id, { status: 'done', summary })
      }
    } catch (err) {
      updateItem(id, { status: 'error', error: err.message })
    }
  }, [addItem, updateItem])

  // Construye el bloque de contexto para los directores
  const buildContextBlock = useCallback(() => {
    const done = items.filter(it => it.status === 'done' && it.summary)
    if (done.length === 0) return ''

    // Ojo: la etiqueta NO debe empezar con la URL cruda ("URL: https://...") — algunos
    // modelos lo leen como una instrucción para navegar el enlace en vivo y se niegan,
    // aunque el resumen ya extraído esté justo debajo. Se deja claro que ya está resuelto.
    const sections = done.map(it => {
      const label = it.type === 'file' ? `Documento ya leído: ${it.name}`
        : it.type === 'url' ? `Página web ya visitada y resumida (fuente: ${it.name})`
        : 'Nota adicional del usuario'
      return `[${label} — usa este resumen tal cual, no hace falta acceder a la fuente original]\n${it.summary}`
    }).join('\n\n')

    return `CONTEXTO ADICIONAL PARA EL ANÁLISIS:\n${sections}`
  }, [items])

  const hasContext = items.some(it => it.status === 'done')
  const isProcessing = items.some(it => ['extracting', 'summarizing', 'fetching'].includes(it.status))

  return {
    items, addNote, processFile, processURL, removeItem,
    buildContextBlock, hasContext, isProcessing,
  }
}
