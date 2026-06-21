import { describe, it, expect } from 'vitest'
import { fmtElapsed, creatureFor, friendlyType } from '../../src/renderer/src/components/agents/agentVisual'

describe('fmtElapsed', () => {
  it('shows seconds under a minute', () => {
    expect(fmtElapsed(0)).toBe('0s')
    expect(fmtElapsed(5_000)).toBe('5s')
    expect(fmtElapsed(59_000)).toBe('59s')
  })
  it('shows m ss between a minute and an hour', () => {
    expect(fmtElapsed(60_000)).toBe('1m 00s')
    expect(fmtElapsed(95_000)).toBe('1m 35s')
    expect(fmtElapsed(59 * 60_000 + 9_000)).toBe('59m 09s')
  })
  it('shows h mm past an hour', () => {
    expect(fmtElapsed(3_600_000)).toBe('1h 00m')
    expect(fmtElapsed(3_600_000 + 2 * 60_000)).toBe('1h 02m')
  })
  it('never returns a negative time', () => {
    expect(fmtElapsed(-1000)).toBe('0s')
  })
})

describe('creatureFor', () => {
  it('returns one of the four mascot characters', () => {
    const valid = ['munu', 'nvurd', 'guru', 'adanana']
    for (const t of ['Explore', 'general-purpose', 'Plan', 'code-reviewer', '']) {
      expect(valid).toContain(creatureFor(t))
    }
  })
  it('is deterministic for the same type', () => {
    expect(creatureFor('Explore')).toBe(creatureFor('Explore'))
  })
})

describe('friendlyType', () => {
  it('keeps a known simple type readable', () => {
    expect(friendlyType('Explore')).toBe('Explore')
  })
  it('humanizes hyphenated/underscored types', () => {
    expect(friendlyType('general-purpose')).toBe('General Purpose')
    expect(friendlyType('code_reviewer')).toBe('Code Reviewer')
  })
  it('falls back to a label for empty input', () => {
    expect(friendlyType('')).toBe('Agent')
  })
})
