import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChairmanChat } from './useChairmanChat.js'

vi.mock('../lib/aiClient.js', () => ({
  callCoach: vi.fn().mockResolvedValue('Respuesta de Roberto'),
}))

describe('useChairmanChat', () => {
  it('sends a message and appends the reply, unlimited (no rate-limit gating)', async () => {
    const { callCoach } = await import('../lib/aiClient.js')
    const { result } = renderHook(() => useChairmanChat())

    const sessionContext = {
      situation: 'situación de prueba',
      turns: [{ director_id: 'estratega', text: 'opinión estratega' }],
      verdict: 'veredicto de prueba',
      language: 'es',
    }

    await act(async () => {
      await result.current.sendMessage('¿Y si esperamos un mes?', sessionContext)
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toEqual({ role: 'user', content: '¿Y si esperamos un mes?' })
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'Respuesta de Roberto' })
    expect(result.current.error).toBeNull()
    expect(callCoach).toHaveBeenCalledWith(expect.objectContaining({ language: 'es' }))
  })

  it('does not send an empty message', async () => {
    const { result } = renderHook(() => useChairmanChat())
    await act(async () => {
      await result.current.sendMessage('   ', { situation: '', turns: [], verdict: '', language: 'es' })
    })
    expect(result.current.messages).toHaveLength(0)
  })
})
