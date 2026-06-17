import { describe, it, expect } from 'vitest'
import { classify, parseAsk } from '@renderer/components/terminal/claudeStatus'

describe('classify', () => {
  it('detects working from the token-counter spinner line', () => {
    expect(classify('✻ Thinking… (12s · 1.2k tokens)')).toBe('working')
  })
  it('detects working from "esc to interrupt"', () => {
    expect(classify('Running tool (esc to interrupt)')).toBe('working')
  })
  it('detects asking from a numbered prompt menu', () => {
    expect(classify('Do you want to proceed?\n❯ 1. Yes\n  2. No')).toBe('asking')
  })
  it('detects asking inside a box-drawing border', () => {
    expect(classify('│ ❯ 1. Yes │\n│   2. No  │')).toBe('asking')
  })
  it('detects asking from "Esc to cancel"', () => {
    expect(classify('Enter to confirm · Esc to cancel')).toBe('asking')
  })
  it('returns idle for ordinary output', () => {
    expect(classify('$ ls\nREADME.md\n$ ')).toBe('idle')
  })
})

describe('parseAsk', () => {
  it('parses a boxed yes/no proceed prompt as binary with a clean title', () => {
    const text = [
      '╭───────────────────────────────╮',
      '│ Bash command                  │',
      '│   npm install                 │',
      '│ Do you want to proceed?       │',
      '│ ❯ 1. Yes                      │',
      "│   2. Yes, and don't ask again │",
      '│   3. No, and tell Claude      │',
      '╰───────────────────────────────╯'
    ].join('\n')
    const ask = parseAsk(text)!
    expect(ask.binary).toBe(true)
    expect(ask.options[0]).toMatch(/^Yes/)
    expect(ask.title).toContain('npm install')
    expect(ask.title).not.toContain('─')
  })

  it('treats a non-yes/no menu as a choice (not binary)', () => {
    const text = [
      'Restore which checkpoint?',
      '❯ 1. 5 minutes ago',
      '  2. 1 hour ago',
      '  3. yesterday'
    ].join('\n')
    const ask = parseAsk(text)!
    expect(ask.binary).toBe(false)
    expect(ask.options).toHaveLength(3)
  })

  it('treats a free-text "Esc to cancel" prompt as non-binary with no options', () => {
    const ask = parseAsk('Type your answer · Esc to cancel')!
    expect(ask.binary).toBe(false)
    expect(ask.options).toHaveLength(0)
  })

  it('marks an ordinary numbered menu as non-multi-select', () => {
    const ask = parseAsk('Restore which checkpoint?\n❯ 1. a\n  2. b')!
    expect(ask.multiSelect).toBe(false)
    expect(ask.submitIndex).toBeNull()
    expect(ask.checkable).toEqual([false, false])
  })

  it('parses a checkbox multi-select prompt with a Submit row', () => {
    const text = [
      'Pick any of these (multi-select).',
      '❯ 1. [ ] Option A',
      '  2. [x] Option B',
      '  Submit',
      '  3. [ ] Type something'
    ].join('\n')
    const ask = parseAsk(text)!
    expect(ask.multiSelect).toBe(true)
    expect(ask.binary).toBe(false)
    expect(ask.options).toEqual(['Option A', 'Option B', 'Submit', 'Type something'])
    expect(ask.checkable).toEqual([true, true, false, true])
    expect(ask.checked).toEqual([false, true, false, false])
    expect(ask.submitIndex).toBe(2)
  })

  it('returns null when not asking', () => {
    expect(parseAsk('just output')).toBeNull()
  })
})
