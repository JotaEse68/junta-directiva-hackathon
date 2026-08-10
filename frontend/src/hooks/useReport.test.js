import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReport } from './useReport.js'

vi.mock('../lib/aiClient.js', () => ({
  callCoach: vi.fn().mockResolvedValue('RESUMEN AMPLIADO\ntexto de prueba'),
}))

describe('useReport', () => {
  it('generates a report from live turns without calling quickTake for any director', async () => {
    const { callCoach } = await import('../lib/aiClient.js')
    const { result } = renderHook(() => useReport())

    const turns = [
      { director_id: 'estratega', text: 'opinión estratega' },
      { director_id: 'financiero', text: 'opinión financiero' },
      { director_id: 'marketing', text: 'opinión marketing' },
      { director_id: 'operaciones', text: 'opinión operaciones' },
      { director_id: 'legal', text: 'opinión legal' },
      { director_id: 'tecnologia', text: 'opinión tecnologia' },
      { director_id: 'ventas', text: 'opinión ventas' },
      { director_id: 'producto', text: 'opinión producto' },
      { director_id: 'personas', text: 'opinión personas' },
      { director_id: 'datos', text: 'opinión datos' },
      { director_id: 'mentor', text: 'opinión mentor' },
      { director_id: 'jottarina', text: 'opinión jottarina' },
    ]

    await act(async () => {
      await result.current.generateReport({
        situation: 'situación de prueba',
        meetingType: 'decision',
        turns,
        verdict: 'veredicto de prueba',
        language: 'es',
      })
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.report.text).toContain('RESUMEN AMPLIADO')
    expect(result.current.report.quickTakes).toHaveLength(0)
    // Solo la llamada del informe final: los 12 directores ya participaron en vivo,
    // así que no hay quickTakes que pedir.
    expect(callCoach).toHaveBeenCalledTimes(1)
  })

  it('always sends the four literal Spanish section headers as fixed structural markers, even when language is en', async () => {
    const { callCoach } = await import('../lib/aiClient.js')
    callCoach.mockClear()
    const { result } = renderHook(() => useReport())

    await act(async () => {
      await result.current.generateReport({
        situation: 'test situation',
        meetingType: 'decision',
        turns: [
          { director_id: 'estratega', text: 'x' }, { director_id: 'financiero', text: 'x' },
          { director_id: 'marketing', text: 'x' }, { director_id: 'operaciones', text: 'x' },
          { director_id: 'legal', text: 'x' }, { director_id: 'tecnologia', text: 'x' },
          { director_id: 'ventas', text: 'x' }, { director_id: 'producto', text: 'x' },
          { director_id: 'personas', text: 'x' }, { director_id: 'datos', text: 'x' },
          { director_id: 'mentor', text: 'x' }, { director_id: 'jottarina', text: 'x' },
        ],
        verdict: 'test verdict',
        language: 'en',
      })
    })

    // The report-generation call is the only one (all 12 directors already debated live,
    // so no quickTake calls) — its `system` prompt (REPORT_SYSTEM) must require the four
    // headers verbatim in Spanish regardless of the response-language directive appended
    // server-side to the user prompt, so ReportModal's KNOWN_HEADERS parsing keeps working
    // for English-locale sessions too (Task 15 review fix).
    expect(callCoach).toHaveBeenCalledTimes(1)
    const { system } = callCoach.mock.calls[0][0]
    expect(system).toContain('RESUMEN AMPLIADO')
    expect(system).toContain('IDEAS ADICIONALES')
    expect(system).toContain('RECURSOS Y HERRAMIENTAS RECOMENDADAS')
    expect(system).toContain('PLAN DE MEJORA DETALLADO')
    expect(system).toMatch(/SIEMPRE literalmente en español/)
  })

  it('requests a quickTake for any director missing from turns', async () => {
    const { callCoach } = await import('../lib/aiClient.js')
    callCoach.mockClear()
    const { result } = renderHook(() => useReport())

    await act(async () => {
      await result.current.generateReport({
        situation: 'situación de prueba',
        meetingType: 'decision',
        turns: [{ director_id: 'estratega', text: 'opinión estratega' }],
        verdict: 'veredicto de prueba',
        language: 'es',
      })
    })

    // 11 directores ausentes + 1 llamada final del informe
    expect(callCoach).toHaveBeenCalledTimes(12)
  })
})
