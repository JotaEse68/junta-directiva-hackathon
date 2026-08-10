import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContextBuilder } from './useContext.js'

// Regression coverage for the Task 17 review finding: validation failures in
// processFile/processURL must create a visible error-state item (not just
// return a value callers may ignore), and item.error must be one of the
// known error CODES that ContextPanel.jsx maps through t() — not a
// hardcoded Spanish string.
describe('useContextBuilder validation failures', () => {
  it('processFile rejects an unsupported extension with a visible error item', async () => {
    const { result } = renderHook(() => useContextBuilder())
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })

    let returned
    await act(async () => {
      returned = await result.current.processFile(file, 'es')
    })

    expect(returned).toEqual({ error: 'FileType' })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      type: 'file',
      name: 'notes.txt',
      status: 'error',
      error: 'FileType',
    })
  })

  it('processFile rejects an oversized file with a visible error item', async () => {
    const { result } = renderHook(() => useContextBuilder())
    const bigContent = new Array(21 * 1024 * 1024).fill('a').join('')
    const file = new File([bigContent], 'big.pdf', { type: 'application/pdf' })

    let returned
    await act(async () => {
      returned = await result.current.processFile(file, 'es')
    })

    expect(returned).toEqual({ error: 'FileSize' })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({ status: 'error', error: 'FileSize' })
  })

  it('processURL rejects a malformed URL with a visible error item', async () => {
    const { result } = renderHook(() => useContextBuilder())

    let returned
    await act(async () => {
      returned = await result.current.processURL('not-a-url', 'es')
    })

    expect(returned).toEqual({ error: 'InvalidUrl' })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toMatchObject({
      type: 'url',
      name: 'not-a-url',
      status: 'error',
      error: 'InvalidUrl',
    })
  })
})
