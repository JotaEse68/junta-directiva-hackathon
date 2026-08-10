import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBoard } from './useBoard.js'

vi.mock('../lib/firestoreClient.js', () => ({
  createSession: vi.fn().mockResolvedValue('session-123'),
  subscribeToSession: vi.fn((sessionId, onUpdate) => {
    onUpdate({ turns: [{ director_id: 'elena-voss', text: 'hola' }], verdict: null, status: 'running' })
    return () => {}
  }),
}))

describe('useBoard', () => {
  it('starts a session and reflects live updates', async () => {
    const { result } = renderHook(() => useBoard())
    await act(async () => { await result.current.convene('situación de prueba', 'strategic') })
    expect(result.current.turns).toHaveLength(1)
    expect(result.current.status).toBe('running')
  })

  it('forwards language to createSession', async () => {
    const { createSession } = await import('../lib/firestoreClient.js')
    const { result } = renderHook(() => useBoard())
    await act(async () => { await result.current.convene('situación de prueba', 'strategic', 'en') })
    expect(createSession).toHaveBeenCalledWith('situación de prueba', 'strategic', 'en')
  })
})
