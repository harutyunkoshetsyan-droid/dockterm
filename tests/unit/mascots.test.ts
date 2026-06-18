import { describe, it, expect } from 'vitest'
import { artFor, CHARACTERS } from '@renderer/components/munu/mascots'

describe('mascots', () => {
  it('lists all four characters with munu first', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(['munu', 'nvurd', 'guru', 'adanana'])
  })

  it('returns distinct art per state', () => {
    expect(artFor('munu', 'idle', false)).not.toEqual(artFor('munu', 'working', false))
  })

  it('sleeping overrides the live state', () => {
    expect(artFor('guru', 'working', true)).toEqual(artFor('guru', 'idle', true))
  })

  it('different characters return different art for the same state', () => {
    expect(artFor('nvurd', 'idle', false)).not.toEqual(artFor('adanana', 'idle', false))
  })

  it('falls back to munu for an unknown character', () => {
    // @ts-expect-error testing runtime fallback
    expect(artFor('bogus', 'idle', false)).toEqual(artFor('munu', 'idle', false))
  })
})
