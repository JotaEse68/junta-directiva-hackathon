import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBoard } from './useBoard.js'

vi.mock('../lib/firestoreClient.js', () => ({
  createSession: vi.fn().mockResolvedValue('session-123'),
  subscribeToSession: vi.fn((sessionId, onUpdate) => {
    onUpdate({ turns: [{ director_id: 'elena-voss', text: 'hola' }], verdict: null, status: 'running' })
    return () => {}
  }),
  pauseSession: vi.fn().mockResolvedValue({ paused: true }),
  resumeSession: vi.fn().mockResolvedValue({ paused: false }),
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
    expect(createSession).toHaveBeenCalledWith('situación de prueba', 'strategic', 'en', undefined, undefined)
  })

  it('forwards directorIds to createSession', async () => {
    const { createSession } = await import('../lib/firestoreClient.js')
    const { result } = renderHook(() => useBoard())
    await act(async () => {
      await result.current.convene('situación de prueba', 'strategic', 'en', ['estratega', 'financiero'])
    })
    expect(createSession).toHaveBeenCalledWith('situación de prueba', 'strategic', 'en', ['estratega', 'financiero'], undefined)
  })

  it('forwards apiKey to createSession (Task 20 BYOK)', async () => {
    const { createSession } = await import('../lib/firestoreClient.js')
    const { result } = renderHook(() => useBoard())
    await act(async () => {
      await result.current.convene('situación de prueba', 'strategic', 'en', ['estratega'], 'user-supplied-key')
    })
    expect(createSession).toHaveBeenCalledWith('situación de prueba', 'strategic', 'en', ['estratega'], 'user-supplied-key')
  })

  it('reflects paused from the subscribed doc', async () => {
    const { subscribeToSession } = await import('../lib/firestoreClient.js')
    subscribeToSession.mockImplementationOnce((sessionId, onUpdate) => {
      onUpdate({ turns: [], verdict: null, status: 'running', paused: true })
      return () => {}
    })
    const { result } = renderHook(() => useBoard())
    await act(async () => { await result.current.convene('situación de prueba', 'strategic') })
    expect(result.current.paused).toBe(true)
  })

  it('pause() calls pauseSession with the current session id', async () => {
    const { pauseSession } = await import('../lib/firestoreClient.js')
    const { result } = renderHook(() => useBoard())
    await act(async () => { await result.current.convene('situación de prueba', 'strategic') })
    await act(async () => { await result.current.pause() })
    expect(pauseSession).toHaveBeenCalledWith('session-123')
  })

  it('resume() calls resumeSession with the current session id', async () => {
    const { resumeSession } = await import('../lib/firestoreClient.js')
    const { result } = renderHook(() => useBoard())
    await act(async () => { await result.current.convene('situación de prueba', 'strategic') })
    await act(async () => { await result.current.resume() })
    expect(resumeSession).toHaveBeenCalledWith('session-123')
  })
})
