import { describe, it, expect } from 'vitest'
import { translate, DIRECTOR_I18N, MEETING_DESC_I18N } from './i18n.js'
import { DIRECTORS, MEETING_TYPES } from './directors.js'

describe('translate', () => {
  it('returns English string by default', () => {
    expect(translate('en', 'board.title')).toBe('Before you decide, convene the board.')
  })
  it('returns Spanish string when lang is es', () => {
    expect(translate('es', 'board.title')).toBe('Antes de decidir, convoca la junta.')
  })
  it('falls back to the key itself if missing', () => {
    expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key')
  })
  it('translates newly added UI chrome keys in both languages', () => {
    expect(translate('en', 'form.meetingType')).toBe('Meeting type')
    expect(translate('es', 'form.meetingType')).toBe('Tipo de reunión')
    expect(translate('en', 'modal.close')).toBe('Close')
    expect(translate('es', 'modal.close')).toBe('Cerrar')
  })
})

describe('DIRECTOR_I18N', () => {
  it('has an English and Spanish bio entry for every director id in directors.js', () => {
    for (const d of DIRECTORS) {
      expect(DIRECTOR_I18N.en[d.id], `missing en bio for ${d.id}`).toBeDefined()
      expect(DIRECTOR_I18N.es[d.id], `missing es bio for ${d.id}`).toBeDefined()
    }
  })
  it('returns the right language for a given director id', () => {
    expect(DIRECTOR_I18N.es.jottarina.personality).toBe(
      DIRECTORS.find(d => d.id === 'jottarina').personality
    )
    expect(DIRECTOR_I18N.en.jottarina.personality).toMatch(/nobody dares say/i)
  })
})

describe('MEETING_DESC_I18N', () => {
  it('has an English and Spanish description for every meeting type id', () => {
    for (const mt of MEETING_TYPES) {
      expect(MEETING_DESC_I18N.en[mt.id], `missing en desc for ${mt.id}`).toBeDefined()
      expect(MEETING_DESC_I18N.es[mt.id]).toBe(mt.desc)
    }
  })
})
