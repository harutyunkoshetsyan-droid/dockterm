import { describe, it, expect } from 'vitest'
import { parseAgentLine, reduceActivity } from '../../src/main/services/agentParse'

/**
 * Fixtures mirror the REAL Claude Code transcript schema (verified against a live
 * `~/.claude/projects/<slug>/<session>.jsonl`): the spawn tool is named `Agent` (older builds:
 * `Task`), carried as a `tool_use` block on a `type:"assistant"` line; the result
 * is a `tool_result` block (matching `tool_use_id`) on a `type:"user"` line, whose
 * `content` is `[{type:"text",text}]` and which only carries `is_error` on failure.
 */
const spawnLine = (
  id: string,
  subagent_type: string,
  description: string,
  ts: string,
  opts: { uuid?: string; cwd?: string; name?: string } = {}
): string =>
  JSON.stringify({
    type: 'assistant',
    uuid: opts.uuid ?? 'msg-1',
    parentUuid: null,
    isSidechain: false,
    cwd: opts.cwd ?? '/Users/me/dockterm',
    sessionId: 'sess-1',
    timestamp: ts,
    message: {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me dispatch an agent.' },
        { type: 'tool_use', id, name: opts.name ?? 'Agent', input: { subagent_type, description, prompt: 'go' } }
      ]
    }
  })

const resultLine = (id: string, ts: string, ok = true, text = 'final result text'): string =>
  JSON.stringify({
    type: 'user',
    timestamp: ts,
    sessionId: 'sess-1',
    message: {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text }], ...(ok ? {} : { is_error: true }) }
      ]
    }
  })

const T0 = '2026-06-20T10:00:00.000Z'
const T1 = '2026-06-20T10:00:05.000Z'
const ms = (iso: string): number => Date.parse(iso)

describe('parseAgentLine', () => {
  it('parses an Agent spawn into a spawn event with type, description, project + label', () => {
    const ev = parseAgentLine(spawnLine('toolu_a', 'Explore', 'Map the pipeline', T0))
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({
      kind: 'spawn',
      id: 'toolu_a',
      type: 'Explore',
      description: 'Map the pipeline',
      project: '/Users/me/dockterm',
      projectLabel: 'dockterm',
      parentMsgId: 'msg-1',
      sessionId: 'sess-1',
      ts: ms(T0)
    })
  })

  it('also accepts the legacy `Task` tool name', () => {
    const ev = parseAgentLine(spawnLine('toolu_t', 'general-purpose', 'do it', T0, { name: 'Task' }))
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ kind: 'spawn', type: 'general-purpose' })
  })

  it('parses a successful tool_result into a result event (ok:true, joined text)', () => {
    const ev = parseAgentLine(resultLine('toolu_a', T1, true, 'all good'))
    expect(ev).toEqual([{ kind: 'result', id: 'toolu_a', ts: ms(T1), ok: true, resultText: 'all good' }])
  })

  it('marks an errored tool_result ok:false', () => {
    const ev = parseAgentLine(resultLine('toolu_a', T1, false, 'it failed'))
    expect(ev[0]).toMatchObject({ kind: 'result', ok: false })
  })

  it('returns one spawn event per Agent in a multi-spawn line', () => {
    const line = JSON.stringify({
      type: 'assistant',
      uuid: 'msg-2',
      cwd: '/p',
      sessionId: 's',
      timestamp: T0,
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'x1', name: 'Agent', input: { subagent_type: 'Explore', description: 'a' } },
          { type: 'tool_use', id: 'x2', name: 'Agent', input: { subagent_type: 'Plan', description: 'b' } }
        ]
      }
    })
    const ev = parseAgentLine(line)
    expect(ev.map((e) => e.kind)).toEqual(['spawn', 'spawn'])
    expect(ev.map((e) => (e as { id: string }).id)).toEqual(['x1', 'x2'])
  })

  it('ignores non-agent tool_use (e.g. Bash) and plain text lines', () => {
    const bash = JSON.stringify({
      type: 'assistant',
      timestamp: T0,
      message: { role: 'assistant', content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: { command: 'ls' } }] }
    })
    expect(parseAgentLine(bash)).toEqual([])
    expect(parseAgentLine(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'hi' }] } }))).toEqual([])
  })

  it('never throws on malformed / empty lines', () => {
    expect(parseAgentLine('not json')).toEqual([])
    expect(parseAgentLine('')).toEqual([])
    expect(parseAgentLine('{"type":"assistant"}')).toEqual([])
  })
})

describe('reduceActivity', () => {
  const opts = { streamOutput: true, retainMs: 30_000, resultMax: 280 }
  const now = ms('2026-06-20T10:00:10.000Z')

  it('a lone spawn is one running agent', () => {
    const a = reduceActivity(parseAgentLine(spawnLine('toolu_a', 'Explore', 'desc', T0)), now, opts)
    expect(a.activeCount).toBe(1)
    expect(a.agents).toHaveLength(1)
    expect(a.agents[0]).toMatchObject({ phase: 'running', ok: null, endedAt: null, durationMs: null, resultPreview: null })
  })

  it('spawn + result becomes a done agent with duration and result preview', () => {
    const ev = [...parseAgentLine(spawnLine('toolu_a', 'Explore', 'desc', T0)), ...parseAgentLine(resultLine('toolu_a', T1, true, 'the answer'))]
    const a = reduceActivity(ev, now, opts)
    expect(a.activeCount).toBe(0)
    expect(a.agents[0]).toMatchObject({ phase: 'done', ok: true, durationMs: 5000, resultPreview: 'the answer' })
  })

  it('an errored result becomes a failed agent', () => {
    const ev = [...parseAgentLine(spawnLine('toolu_a', 'Explore', 'd', T0)), ...parseAgentLine(resultLine('toolu_a', T1, false, 'boom'))]
    expect(reduceActivity(ev, now, opts).agents[0]).toMatchObject({ phase: 'failed', ok: false })
  })

  it('drops finished agents past the retain window', () => {
    const ev = [...parseAgentLine(spawnLine('toolu_a', 'Explore', 'd', T0)), ...parseAgentLine(resultLine('toolu_a', T1, true))]
    const muchLater = ms(T1) + 60_000
    const a = reduceActivity(ev, muchLater, { ...opts, retainMs: 30_000 })
    expect(a.agents).toHaveLength(0)
  })

  it('keeps a still-running agent regardless of age (no result yet)', () => {
    const a = reduceActivity(parseAgentLine(spawnLine('toolu_a', 'Explore', 'd', T0)), ms(T0) + 600_000, opts)
    expect(a.agents).toHaveLength(1)
    expect(a.agents[0].phase).toBe('running')
  })

  it('streamOutput:false withholds result content but keeps metadata', () => {
    const ev = [...parseAgentLine(spawnLine('toolu_a', 'Explore', 'desc', T0)), ...parseAgentLine(resultLine('toolu_a', T1, true, 'secret content'))]
    const a = reduceActivity(ev, now, { ...opts, streamOutput: false })
    expect(a.agents[0]).toMatchObject({ phase: 'done', ok: true, resultPreview: null })
  })

  it('caps the result preview at resultMax characters', () => {
    const long = 'x'.repeat(1000)
    const ev = [...parseAgentLine(spawnLine('toolu_a', 'Explore', 'd', T0)), ...parseAgentLine(resultLine('toolu_a', T1, true, long))]
    const a = reduceActivity(ev, now, { ...opts, resultMax: 50 })
    expect(a.agents[0].resultPreview!.length).toBeLessThanOrEqual(50)
  })

  it('groups running agents by project, most-active first (finished excluded)', () => {
    const ev = [
      ...parseAgentLine(spawnLine('a1', 'Explore', 'd', T0, { cwd: '/Users/me/alpha' })),
      ...parseAgentLine(spawnLine('a2', 'Explore', 'd', T0, { cwd: '/Users/me/alpha' })),
      ...parseAgentLine(spawnLine('b1', 'Explore', 'd', T0, { cwd: '/Users/me/beta' })),
      ...parseAgentLine(resultLine('b1', T1, true))
    ]
    const a = reduceActivity(ev, now, opts)
    expect(a.byProject).toEqual([{ project: '/Users/me/alpha', label: 'alpha', count: 2 }])
  })

  it('orders agents newest-first and preserves the spawning parent for tree grouping', () => {
    const ev = [
      ...parseAgentLine(spawnLine('a1', 'Explore', 'first', T0, { uuid: 'p1' })),
      ...parseAgentLine(spawnLine('a2', 'Plan', 'second', T1, { uuid: 'p1' }))
    ]
    const a = reduceActivity(ev, now, opts)
    expect(a.agents.map((x) => x.id)).toEqual(['a2', 'a1'])
    expect(a.agents.every((x) => x.parentMsgId === 'p1')).toBe(true)
  })
})
