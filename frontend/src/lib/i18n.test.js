import { describe, it, expect } from 'vitest'
import { translate } from './i18n.js'

describe('translate', () => {
  it('returns English string by default', () => {
    expect(translate('en', 'board.title')).toBe('Your Board of Directors')
  })
  it('returns Spanish string when lang is es', () => {
    expect(translate('es', 'board.title')).toBe('Tu Junta Directiva')
  })
  it('falls back to the key itself if missing', () => {
    expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key')
  })
})
