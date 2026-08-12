import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_TEXT = 8000

async function extractPdf(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
  let text = ''
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 20); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    text += `${content.items.map(item => item.str).join(' ')}\n`
  }
  return text.slice(0, MAX_TEXT)
}

function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function prepareChatAttachment(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('Archivo demasiado grande (máx. 8 MB)')
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (file.type.startsWith('image/')) {
    return { name: file.name, kind: 'image', mimeType: file.type, data: await fileAsBase64(file) }
  }
  if (ext === 'pdf') {
    const text = await extractPdf(file)
    if (!text.trim()) throw new Error('No se pudo leer texto del PDF')
    return { name: file.name, kind: 'document', text }
  }
  if (ext === 'md' || ext === 'txt') {
    const text = (await file.text()).slice(0, MAX_TEXT)
    if (!text.trim()) throw new Error('El documento está vacío')
    return { name: file.name, kind: 'document', text }
  }
  throw new Error('Adjunta una imagen, PDF, Markdown o texto')
}
