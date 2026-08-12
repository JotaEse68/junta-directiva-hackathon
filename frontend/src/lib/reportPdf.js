const NAVY = [8, 20, 45]
const INK = [25, 42, 70]
const BLUE = [55, 118, 255]
const TEAL = [35, 190, 174]
const PALE = [239, 245, 255]
const MUTED = [91, 108, 135]

function safeText(value = '') {
  return String(value)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, '-')
}

function splitSections(text) {
  const lines = safeText(text).split('\n').map(line => line.trim()).filter(Boolean)
  const sections = []
  let current = { title: 'PLAN DE ACCION', lines: [] }
  for (const line of lines) {
    const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '')
    if (/^(HOJA DE RUTA|ACCIONES PRIORITARIAS|RESPONSABLES Y ESFUERZO|KPIS Y SEÑALES|RIESGOS Y CONTINGENCIAS|ESCENARIOS DE DECISIÓN)/i.test(clean)) {
      if (current.lines.length) sections.push(current)
      current = { title: clean.toUpperCase(), lines: [] }
    } else {
      current.lines.push(clean.replace(/^[-*]\s*/, '• '))
    }
  }
  if (current.lines.length) sections.push(current)
  return sections
}

export async function createExecutiveReportPdf({ situation, verdict, report, language = 'es' }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  let page = 1
  let y = 0

  const logo = (x, top, inverse = false) => {
    doc.setDrawColor(...(inverse ? [155, 194, 255] : BLUE))
    doc.setLineWidth(.8)
    doc.circle(x + 7, top + 7, 6.5, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...(inverse ? NAVY : [255, 255, 255]))
    doc.text('JD', x + 7, top + 9, { align: 'center' })
  }

  const footer = () => {
    doc.setDrawColor(220, 228, 240)
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('JUNTA DIRECTIVA AI  |  INFORME EJECUTIVO CONFIDENCIAL', margin, pageHeight - 8)
    doc.text(`${page}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  const startPage = (title, kicker = 'INFORME EJECUTIVO') => {
    if (page > 1) doc.addPage()
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, pageWidth, 24, 'F')
    logo(margin, 5, true)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(177, 205, 255)
    doc.text(kicker, margin + 18, 11)
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(title, margin + 18, 18)
    y = 37
    footer()
  }

  const ensure = height => {
    if (y + height > pageHeight - 20) {
      page += 1
      startPage('Plan de accion', 'JUNTA DIRECTIVA AI')
    }
  }

  const paragraph = (text, { size = 10.2, color = INK, gap = 4, bold = false } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(safeText(text), pageWidth - margin * 2)
    ensure(lines.length * (size * .46) + gap)
    doc.text(lines, margin, y)
    y += lines.length * (size * .46) + gap
  }

  const sectionHeading = title => {
    ensure(16)
    doc.setFillColor(...PALE)
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 10, 2, 2, 'F')
    doc.setFillColor(...TEAL)
    doc.rect(margin, y - 5, 2, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLUE)
    doc.text(safeText(title), margin + 6, y + 1.5)
    y += 15
  }

  // Cover / decision brief.
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  doc.setFillColor(...BLUE)
  doc.circle(pageWidth - 13, 19, 42, 'F')
  doc.setFillColor(...TEAL)
  doc.circle(pageWidth - 25, 40, 17, 'F')
  logo(margin, 22, true)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(168, 198, 255)
  doc.text('JUNTA DIRECTIVA AI', margin + 18, 30)
  doc.setFontSize(31)
  doc.setTextColor(255, 255, 255)
  doc.text('Informe', margin, 78)
  doc.text('ejecutivo', margin, 91)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(202, 216, 240)
  doc.text(language === 'en' ? 'Strategic decision dossier' : 'Dossier de decision estrategica', margin, 106)
  doc.setDrawColor(83, 140, 255)
  doc.setLineWidth(1.2)
  doc.line(margin, 123, pageWidth - margin, 123)
  doc.setFontSize(8.5)
  doc.setTextColor(168, 198, 255)
  doc.text(language === 'en' ? 'DECISION UNDER REVIEW' : 'DECISION ANALIZADA', margin, 139)
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  const coverSituation = doc.splitTextToSize(safeText(situation), pageWidth - margin * 2)
  doc.text(coverSituation.slice(0, 7), margin, 149)
  doc.setFontSize(8)
  doc.setTextColor(168, 198, 255)
  doc.text(`Generado el ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES')}`, margin, pageHeight - 22)
  doc.text('Powered by Gemini on Google Cloud', margin, pageHeight - 15)

  page += 1
  startPage(language === 'en' ? 'Decision brief' : 'Resumen de decision')
  sectionHeading(language === 'en' ? 'THE SITUATION' : 'LA SITUACION')
  paragraph(situation, { size: 11, gap: 9 })
  sectionHeading(language === 'en' ? 'CHAIRMAN VERDICT' : 'VEREDICTO DEL CHAIRMAN')
  paragraph(verdict || (language === 'en' ? 'The Chairman verdict is not available.' : 'El veredicto del Chairman no esta disponible.'), { size: 10.7, gap: 11 })
  sectionHeading(language === 'en' ? 'EXECUTION NOTE' : 'NOTA DE EJECUCION')
  paragraph(language === 'en' ? 'This report turns the board debate into an operational plan. Use it as a working document: assign owners, set dates and review the signals each week.' : 'Este informe convierte el debate de la junta en un plan operativo. Usalo como documento de trabajo: asigna responsables, fechas y revisa las senales cada semana.', { size: 10.2 })

  for (const section of splitSections(report.text)) {
    page += 1
    startPage('Plan de accion', 'JUNTA DIRECTIVA AI')
    sectionHeading(section.title)
    section.lines.forEach(line => paragraph(line, { gap: 5 }))
  }

  if (report.quickTakes?.length) {
    page += 1
    startPage(language === 'en' ? 'Additional perspectives' : 'Perspectivas adicionales')
    paragraph(language === 'en' ? 'Short perspectives from directors who did not participate in the live debate.' : 'Aportes breves de directores que no participaron en el debate en vivo.', { color: MUTED, gap: 9 })
    report.quickTakes.forEach(({ director, text }) => {
      ensure(23)
      doc.setFillColor(...PALE)
      doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 9, 2, 2, 'F')
      doc.setFillColor(...BLUE)
      doc.circle(margin + 6, y - .5, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      doc.text(safeText(director.name), margin + 12, y + 1.5)
      y += 10
      paragraph(text, { size: 9.8, color: INK, gap: 8 })
    })
  }

  return doc
}

export async function downloadExecutiveReportPdf(data) {
  const doc = await createExecutiveReportPdf(data)
  doc.save(`junta-directiva-informe-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function downloadChairmanReplyPdf({ situation, reply, language = 'es' }) {
  const doc = await createExecutiveReportPdf({
    situation,
    verdict: reply,
    report: { text: `ACCIONES PRIORITARIAS\n${reply}`, quickTakes: [] },
    language,
  })
  doc.save(`junta-directiva-respuesta-${new Date().toISOString().slice(0, 10)}.pdf`)
}
