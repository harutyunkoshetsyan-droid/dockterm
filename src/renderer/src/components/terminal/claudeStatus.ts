import type { AskInfo } from '@shared/types'

export type ClaudeState = 'idle' | 'working' | 'asking'

const SPINNERS = new Set(['·', '✢', '✳', '✶', '✻', '✽'])
// Box-drawing characters Claude uses around its permission prompt.
const BOX = /[│┃┆┇┊┋╎╏─━┄┅┈┉╌╍╭╮╰╯┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/g

/** A line like "✻ Thinking… (…)" — spinner char, space, contains an ellipsis. */
function hasTokenCounterLine(text: string): boolean {
  return text.split('\n').some((line) => {
    const first = line[0]
    return !!first && SPINNERS.has(first) && line[1] === ' ' && line.includes('…')
  })
}

/** A permission-menu line: "❯ <digit>" (after any box border / leading space). */
function hasUserPrompt(text: string): boolean {
  return text.split('\n').some((line) => {
    const t = line.replace(/^[\s│┃|>]*/, '')
    return t.startsWith('❯ ') && /\d/.test(t[2] ?? '')
  })
}

export function classify(text: string): ClaudeState {
  if (hasTokenCounterLine(text) || text.includes('esc to interrupt')) return 'working'
  if (text.includes('Esc to cancel') || hasUserPrompt(text)) return 'asking'
  return 'idle'
}

function cleanLine(line: string): string {
  return line.replace(BOX, ' ').replace(/\s+/g, ' ').trim()
}

const OPTION_RE = /^\s*❯?\s*(\d+)[.)]\s+(.*)$/

/**
 * Parse a Claude permission prompt into a clean title + the menu options, and
 * decide whether it's a simple Yes/No (the only case we offer one-click [y]/[n]).
 */
export function parseAsk(text: string): AskInfo | null {
  if (classify(text) !== 'asking') return null

  const raw = text.split('\n')
  const options: string[] = []
  let firstMenuIdx = -1

  raw.forEach((line, i) => {
    const stripped = line.replace(BOX, ' ')
    const m = stripped.match(OPTION_RE)
    if (m) {
      if (firstMenuIdx < 0) firstMenuIdx = i
      const label = cleanLine(m[2])
      if (label) options.push(label)
    }
  })

  let title: string | null = null
  if (firstMenuIdx > 0) {
    const above = raw
      .slice(0, firstMenuIdx)
      .map(cleanLine)
      .filter(Boolean)
      .filter((l) => !/^do you want to proceed\??$/i.test(l))
      .filter((l) => l.replace(/[.\s·]/g, '').length > 0) // drop dash/dot-only lines
    if (above.length) title = above.slice(-3).join(' · ').slice(0, 160)
  }

  // Binary only when there's a real numbered Yes + No — otherwise we never
  // auto-offer buttons (could be a multi-choice menu or a free-text input).
  const hasYes = options.some((o) => /^yes\b/i.test(o))
  const hasNo = options.some((o) => /^no\b/i.test(o))
  const binary = options.length > 0 && hasYes && hasNo

  return { title, options, binary }
}
