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
// An un-numbered, selectable action row inside the menu (e.g. multi-select's
// "Submit"). Matched only in multi-select mode so it can't catch stray prose.
const ACTION_RE = /^\s*❯?\s*(submit)\s*$/i
// A leading checkbox marker: "[ ]" unchecked, "[x]"/"[✓]"/"[✔]"/"[·]" checked.
const CHECKBOX_RE = /^\[([ xX✓✔·•])\]\s*(.*)$/

/**
 * Parse a Claude permission prompt into a clean title + the menu rows, in the
 * order they appear (so arrow-key navigation counts line up). Decides whether
 * it's a simple Yes/No (one-click [y]/[n]) or a checkbox multi-select.
 */
export function parseAsk(text: string): AskInfo | null {
  if (classify(text) !== 'asking') return null

  const raw = text.split('\n')

  // First pass: is this a checkbox (multi-select) prompt? The marker appears
  // after the "N." prefix, so scan anywhere in the line, not just the start.
  const multiSelect =
    /\(\s*multi[- ]?select\s*\)/i.test(text) || /\[[ xX✓✔·•]\]/.test(text)

  // Collect the navigable rows in textual order. Numbered options always count;
  // un-numbered action rows (Submit) only count for multi-select, where they're
  // real navigation stops between the checkboxes.
  const rows: { label: string }[] = []
  let firstMenuIdx = -1
  raw.forEach((line, i) => {
    const stripped = line.replace(BOX, ' ')
    const m = stripped.match(OPTION_RE)
    if (m) {
      const label = cleanLine(m[2])
      if (label) {
        if (firstMenuIdx < 0) firstMenuIdx = i
        rows.push({ label })
      }
      return
    }
    if (multiSelect) {
      const a = cleanLine(stripped).match(ACTION_RE)
      if (a) {
        if (firstMenuIdx < 0) firstMenuIdx = i
        rows.push({ label: 'Submit' })
      }
    }
  })

  // Split each row's checkbox marker (if any) from its display label.
  const options: string[] = []
  const checkable: boolean[] = []
  const checked: boolean[] = []
  let submitIndex: number | null = null
  rows.forEach((r, i) => {
    const cb = r.label.match(CHECKBOX_RE)
    if (cb) {
      options.push(cleanLine(cb[2]))
      checkable.push(true)
      checked.push(cb[1] !== ' ')
    } else {
      options.push(r.label)
      checkable.push(false)
      checked.push(false)
      if (/^submit$/i.test(r.label)) submitIndex = i
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
    if (above.length) title = above.slice(-3).join(' · ').slice(0, 200)
  }

  // Binary only when there's a real numbered Yes + No — otherwise we never
  // auto-offer buttons (could be a multi-choice menu or a free-text input).
  const hasYes = options.some((o) => /^yes\b/i.test(o))
  const hasNo = options.some((o) => /^no\b/i.test(o))
  const binary = !multiSelect && options.length > 0 && hasYes && hasNo

  return { title, options, binary, multiSelect, checkable, checked, submitIndex }
}
