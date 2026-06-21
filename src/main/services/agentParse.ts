import type { AgentActivity, LiveAgent } from '@shared/types'

/**
 * Pure transcript → live-agent logic (no I/O, no electron) so it is unit-testable.
 *
 * Claude Code records a sub-agent spawn as a `tool_use` block named `Agent` (older
 * builds: `Task`) on a `type:"assistant"` line, carrying `input.subagent_type` +
 * `input.description`. Completion is a `tool_result` block with the same
 * `tool_use_id` on a `type:"user"` line, whose `content` is `[{type:"text",text}]`
 * and which only sets `is_error` on failure. The agent's internal step-by-step
 * output is NOT written to the parent transcript, so what we can reconstruct is a
 * live status (running / done / failed), timing, and the final result text.
 */

export type AgentEvent =
  | {
      kind: 'spawn'
      id: string
      parentMsgId: string | null
      type: string
      description: string
      project: string
      projectLabel: string
      sessionId: string
      ts: number
    }
  | { kind: 'result'; id: string; ts: number; ok: boolean; resultText: string }

const AGENT_TOOLS = new Set(['Agent', 'Task'])

interface RawContent {
  type?: string
  id?: string
  name?: string
  input?: { subagent_type?: unknown; description?: unknown }
  tool_use_id?: string
  is_error?: boolean
  content?: unknown
  text?: unknown
}
interface RawLine {
  uuid?: string
  cwd?: string
  sessionId?: string
  timestamp?: string
  message?: { content?: RawContent[] }
}

/** Last path segment of a cwd, for grouping ('/Users/me/dockterm' → 'dockterm'). */
function labelOf(project: string): string {
  const segs = project.split(/[\\/]/).filter(Boolean)
  return segs.length ? segs[segs.length - 1] : project
}

/** Flatten a tool_result `content` (string | [{text}]) into plain text. */
function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        c && typeof c === 'object' && typeof (c as { text?: unknown }).text === 'string'
          ? (c as { text: string }).text
          : ''
      )
      .join('')
  }
  return ''
}

const str = (x: unknown): string => (typeof x === 'string' ? x : '')

/** Parse one JSONL line into zero or more agent events (a line may spawn several). */
export function parseAgentLine(line: string): AgentEvent[] {
  const s = line.trim()
  if (!s || s[0] !== '{') return []
  let o: RawLine
  try {
    o = JSON.parse(s) as RawLine
  } catch {
    return []
  }
  const content = o.message?.content
  if (!Array.isArray(content)) return []
  const parsed = Date.parse(o.timestamp ?? '')
  const ts = Number.isFinite(parsed) ? parsed : 0
  const out: AgentEvent[] = []
  for (const c of content) {
    if (!c || typeof c !== 'object') continue
    if (
      c.type === 'tool_use' &&
      typeof c.name === 'string' &&
      AGENT_TOOLS.has(c.name) &&
      c.input &&
      typeof c.input.subagent_type === 'string'
    ) {
      const project = str(o.cwd)
      out.push({
        kind: 'spawn',
        id: str(c.id),
        parentMsgId: typeof o.uuid === 'string' ? o.uuid : null,
        type: c.input.subagent_type,
        description: str(c.input.description),
        project,
        projectLabel: project ? labelOf(project) : 'unknown',
        sessionId: str(o.sessionId),
        ts
      })
    } else if (c.type === 'tool_result' && typeof c.tool_use_id === 'string') {
      out.push({ kind: 'result', id: c.tool_use_id, ts, ok: c.is_error !== true, resultText: textOf(c.content) })
    }
  }
  return out
}

export interface ReduceOpts {
  /** Read the agent's final result text (else metadata-only). Default true. */
  streamOutput?: boolean
  /** Drop finished agents this long after they end (ms). Default 30s. */
  retainMs?: number
  /** Cap the stored result preview (chars). Default 280. */
  resultMax?: number
}

/**
 * Fold an ordered event list into the live snapshot. A spawn creates/refreshes a
 * running agent; a result completes it (done/failed + duration + result preview).
 * Finished agents linger for `retainMs` (so the UI can celebrate), then drop.
 */
export function reduceActivity(events: AgentEvent[], now: number, opts: ReduceOpts = {}): AgentActivity {
  const streamOutput = opts.streamOutput !== false
  const retainMs = opts.retainMs ?? 30_000
  const resultMax = opts.resultMax ?? 280

  const map = new Map<string, LiveAgent>()
  const order: string[] = []
  for (const e of events) {
    if (e.kind === 'spawn') {
      if (!e.id) continue
      const prev = map.get(e.id)
      if (!prev) order.push(e.id)
      map.set(e.id, {
        id: e.id,
        parentMsgId: e.parentMsgId,
        type: e.type,
        description: e.description,
        project: e.project,
        projectLabel: e.projectLabel,
        sessionId: e.sessionId,
        startedAt: e.ts,
        endedAt: prev?.endedAt ?? null,
        phase: prev?.phase ?? 'running',
        durationMs: prev?.durationMs ?? null,
        ok: prev?.ok ?? null,
        resultPreview: prev?.resultPreview ?? null
      })
    } else {
      const a = map.get(e.id)
      if (!a) continue
      a.endedAt = e.ts
      a.durationMs = a.startedAt ? Math.max(0, e.ts - a.startedAt) : null
      a.ok = e.ok
      a.phase = e.ok ? 'done' : 'failed'
      a.resultPreview = streamOutput ? e.resultText.replace(/\s+/g, ' ').trim().slice(0, resultMax) || null : null
    }
  }

  const kept: LiveAgent[] = []
  for (const id of order) {
    const a = map.get(id)
    if (!a) continue
    if (a.endedAt != null && now - a.endedAt > retainMs) continue
    kept.push(a)
  }
  const agents = kept.slice().sort((x, y) => y.startedAt - x.startedAt)

  const running = agents.filter((a) => a.phase === 'running')
  const byProjMap = new Map<string, { project: string; label: string; count: number }>()
  for (const a of running) {
    const e = byProjMap.get(a.project) ?? { project: a.project, label: a.projectLabel, count: 0 }
    e.count++
    byProjMap.set(a.project, e)
  }
  const byProject = [...byProjMap.values()].sort((a, b) => b.count - a.count)

  return { updatedAt: now, agents, activeCount: running.length, byProject }
}
