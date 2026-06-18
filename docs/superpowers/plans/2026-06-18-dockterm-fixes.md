# DockTerm Multi-Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven independent DockTerm issues — split-grid popup clipping, inaccurate usage panel, multi-second lag when opening/splitting terminals after a `cd`, stale/global git status, missing per-pane terminal labels, broken Linux copy/paste, and random terminal character corruption.

**Architecture:** Each issue is an independent, separately-committable task. Pure logic (key resolver, watch policy, usage math) is extracted into testable modules under TDD; UI/renderer behavior is verified manually with explicit repro steps. No new IPC channels are added except one extension (`pty:create` size timing is changed, not the contract). All changes respect the IPC allowlist, settings forward-migration, `pathJail`, and `gitInvoke` invariants.

**Tech Stack:** Electron, React 19, TypeScript strict, electron-vite, zustand, vitest, xterm.js `@xterm/xterm ^6`, `@xterm/addon-webgl ^0.19`, chokidar 4, node-pty, simple-git.

## Global Constraints

- `npm run typecheck` must pass for BOTH main (node) and renderer (web) configs after every task.
- `npm test` (vitest) must pass; add/extend unit tests in `tests/unit` for pure logic only (parsers, policies, math) — never UI.
- Release/PR gate: `npm run typecheck && npm test && npm run build` must all pass before the work is considered done.
- TypeScript strict; Prettier-ish (2-space indent, single quotes, no semicolons-at-EOL style matching surrounding code).
- The renderer NEVER imports Node/Electron — it only crosses the boundary via `window.dockterm`.
- Do not bypass `pathJail` or call `simpleGit` outside `gitService`. Do not add telemetry, AI API calls, or stored tokens (project principles).
- Tasks are independent; they may be executed in any order or cherry-picked. Commit after each task.

---

## File Structure

| File | Responsibility | Task |
|------|----------------|------|
| `src/renderer/src/styles/components.css` | `.grid-menu` popup position | 1 |
| `src/renderer/src/components/terminal/terminalKeys.ts` (new) | Pure keydown→action resolver | 6 |
| `tests/unit/terminalKeys.test.ts` (new) | Tests for the resolver | 6 |
| `src/renderer/src/components/terminal/terminalPool.ts` | xterm lifecycle: key handling, OSC title, WebGL recovery, fit-before-create | 5, 6, 7 |
| `src/renderer/src/components/terminal/useTerminal.ts` | `TerminalOptions.onTitle` | 5 |
| `src/renderer/src/components/terminal/PaneTree.tsx` | Per-pane title bar | 5 |
| `src/renderer/src/state/useWorkspaceStore.ts` | `paneTitle` map + `setPaneTitle` | 5 |
| `src/renderer/src/components/layout/Shell.tsx` | git refresh race + repo banner | 4 |
| `src/renderer/src/state/useAppStore.ts` | `initGitRepo` targets active root | 4 |
| `src/main/services/watchPolicy.ts` (new) | Bounded dir-count + watch budget | 3 |
| `tests/unit/watchPolicy.test.ts` (new) | Tests for watch policy | 3 |
| `src/main/services/watcherService.ts` | Debounced retarget + big-tree guard | 3 |
| `src/main/services/usageService.ts` | Parse 429 limit lines, real reset, calibration, correct anchoring | 2 |
| `tests/unit/usageService.test.ts` | Extend with limit-parse / anchoring / calibration tests | 2 |

---

## Background: why the usage panel can never be a perfect copy of `claude-counter`

`claude-counter` (the repo the user cited) is a **browser extension for claude.ai**. It works by wrapping `window.fetch` on the claude.ai page and reading two things the Anthropic **web** API returns: the SSE `message_limit` event (`windows: { '5h': { utilization, resets_at }, '7d': {...} }`) and the `/api/organizations/<org>/usage` endpoint. Both carry **exact, unrounded utilization fractions and real reset timestamps**.

DockTerm runs the Claude Code **CLI**, not the web app. We confirmed by scanning the user's real `~/.claude/projects/**/*.jsonl`:
- There are **zero** structured `utilization` / `windows` / `resets_at` fields in the transcripts.
- The only token signal is `message.usage` (input/output/cache tokens) — already parsed.
- The only limit signal is **429 error lines**: `{"error":"rate_limit","apiErrorStatus":429,...,"message":{"content":[{"type":"text","text":"You've hit your session limit · resets 7:40am (Asia/Yerevan)"}]}}`.

So exact parity with `/status` is impossible offline (the CLAUDE.md already says this). Task 2 therefore maximizes **local** accuracy with the two best available signals: (a) the real reset clock-time and 100%-usage anchor from 429 lines, and (b) per-user **self-calibration** of the 5-hour budget from those 429 anchors — plus it fixes a real window-anchoring bug (the code floors the window anchor to the hour, but the observed resets land on minutes like `:40`/`:50`).

---

## Task 1: Fix the split-grid popup clipping

**Files:**
- Modify: `src/renderer/src/styles/components.css` (the `.grid-menu` rule, ~lines 595–609)

**Context:** `TabStrip.tsx` renders the grid button as the right-most control; its popup `.grid-menu` is `position: absolute; top: 30px; right: 0` inside `.tabstrip__grid` (`position: relative`). Because the button hugs the window's right edge, the popup's border/shadow render flush against (or just past) the viewport edge and look clipped. Pulling it slightly inward and clamping its width makes it fully visible.

- [ ] **Step 1: Adjust the popup position to be viewport-safe**

In `src/renderer/src/styles/components.css`, change the `.grid-menu` rule. Current:

```css
.grid-menu {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
  min-width: 168px;
  background: var(--overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}
```

Replace the `right: 0;` line and add width-clamping so the popup never reaches the window edge or overflows:

```css
.grid-menu {
  position: absolute;
  top: 30px;
  right: 6px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
  min-width: 168px;
  max-width: calc(100vw - 16px);
  background: var(--overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`. Click the grid (`LayoutGrid`) icon in the tab strip. Confirm the "Split this tab into…" popup is fully visible — its right border and drop-shadow are not cut off by the window edge — at both a wide and a narrow window width. Compare against the screenshot in the issue.

If the popup is still clipped on the right at the narrowest width, increase `right` to `10px`. If it now sits too far from the icon, reduce to `4px`. Stop once it is fully on-screen and visually anchored under the icon.

- [ ] **Step 3: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/renderer/src/styles/components.css
git commit -m "fix(ui): keep split-grid popup fully on-screen"
```

---

## Task 2: Make the usage panel accurate (429-anchored reset + self-calibration + correct window anchoring)

**Files:**
- Modify: `src/main/services/usageService.ts`
- Test: `tests/unit/usageService.test.ts` (extend existing file)

**Interfaces:**
- Produces: `LimitRecord` (`{ ts: number; resetAt: number; kind: 'session' }`), `parseLimitLine(line: string, now?: number): LimitRecord | null`, `parseResetClock(text: string, fromMs: number): number | null`, `calibrate5hLimit(records: UsageRecord[], hits: LimitRecord[], fallback: number): number`.
- Consumes: existing `UsageRecord`, `weighted()`, `computeWindow()`, `buildSnapshot()` in the same file.

- [ ] **Step 1: Write failing tests for `parseResetClock`**

Add to `tests/unit/usageService.test.ts` (import the new symbols alongside the existing imports):

```ts
import { parseResetClock, parseLimitLine, calibrate5hLimit } from '@main/services/usageService'

describe('parseResetClock', () => {
  const base = new Date(2026, 5, 18, 13, 0, 0, 0).getTime() // local 1:00pm

  it('parses an on-the-hour pm reset to the next occurrence', () => {
    const r = parseResetClock('You’ve hit your session limit · resets 7pm', base)
    expect(r).not.toBeNull()
    expect(new Date(r!).getHours()).toBe(19)
    expect(new Date(r!).getMinutes()).toBe(0)
    expect(r!).toBeGreaterThan(base)
  })

  it('parses a minute-precise am reset and rolls to the next day when already past', () => {
    const r = parseResetClock('resets 7:40am (Asia/Yerevan)', base)
    expect(new Date(r!).getHours()).toBe(7)
    expect(new Date(r!).getMinutes()).toBe(40)
    expect(r!).toBeGreaterThan(base) // 7:40am already passed today -> tomorrow
    expect(r! - base).toBeLessThan(24 * 3600_000)
  })

  it('returns null when no reset clock is present', () => {
    expect(parseResetClock('some unrelated text', base)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/usageService.test.ts -t parseResetClock`
Expected: FAIL — `parseResetClock` is not exported.

- [ ] **Step 3: Implement `parseResetClock` and `parseLimitLine`**

In `src/main/services/usageService.ts`, after the `parseUsageLine` function (around line 101), add:

```ts
/** A locally-observed rate-limit (429) hit from a Claude Code transcript. */
export interface LimitRecord {
  /** When the limit was hit (ms). */
  ts: number
  /** Absolute ms when the window resets (parsed from the human reset clock). */
  resetAt: number
  /** Only the 5-hour "session" limit is ever surfaced in transcripts. */
  kind: 'session'
}

/**
 * Parse a "resets 7:40am" / "resets 3pm" clock time out of a 429 message into an
 * absolute ms timestamp — the next occurrence of that wall-clock at or after
 * `fromMs`. Local timezone is the user's timezone (DockTerm runs on their
 * machine), which matches the tz the message is rendered in. Pure / testable.
 */
export function parseResetClock(text: string, fromMs: number): number | null {
  const m = text.match(/resets?\s+(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i)
  if (!m) return null
  let hour = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  if (hour === 12) hour = 0
  if (m[3].toLowerCase() === 'pm') hour += 12
  const d = new Date(fromMs)
  d.setHours(hour, min, 0, 0)
  let t = d.getTime()
  if (t <= fromMs) t += 86_400_000 // the reset is always in the future of the hit
  return t
}

/**
 * Parse a 429 "you've hit your session limit" transcript line into a LimitRecord,
 * or null if the line isn't a rate-limit error. Pure / testable.
 */
export function parseLimitLine(line: string, now = Date.now()): LimitRecord | null {
  const s = line.trim()
  if (!s || s.indexOf('rate_limit') === -1) return null // cheap reject
  let o: { error?: string; apiErrorStatus?: number; timestamp?: string; message?: { content?: unknown } }
  try {
    o = JSON.parse(s)
  } catch {
    return null
  }
  if (o.error !== 'rate_limit' && o.apiErrorStatus !== 429) return null
  let text = ''
  const content = o.message?.content
  if (Array.isArray(content)) {
    for (const c of content) {
      if (c && typeof c === 'object' && typeof (c as { text?: unknown }).text === 'string') {
        text += (c as { text: string }).text
      }
    }
  }
  if (!/limit/i.test(text)) return null
  const parsedTs = Date.parse(o.timestamp ?? '')
  const ts = Number.isFinite(parsedTs) ? parsedTs : now
  const resetAt = parseResetClock(text, ts)
  if (resetAt == null) return null
  return { ts, resetAt, kind: 'session' }
}
```

- [ ] **Step 4: Run the `parseResetClock` tests to verify they pass**

Run: `npx vitest run tests/unit/usageService.test.ts -t parseResetClock`
Expected: PASS.

- [ ] **Step 5: Write failing tests for `parseLimitLine` and `calibrate5hLimit`**

Add to `tests/unit/usageService.test.ts`:

```ts
describe('parseLimitLine', () => {
  it('extracts ts + resetAt from a 429 session-limit line', () => {
    const ts = new Date(2026, 5, 18, 13, 0, 0, 0).getTime()
    const line = JSON.stringify({
      type: 'assistant',
      error: 'rate_limit',
      apiErrorStatus: 429,
      timestamp: new Date(ts).toISOString(),
      message: { content: [{ type: 'text', text: "You've hit your session limit · resets 7pm" }] }
    })
    const rec = parseLimitLine(line)
    expect(rec).not.toBeNull()
    expect(rec!.kind).toBe('session')
    expect(new Date(rec!.resetAt).getHours()).toBe(19)
    expect(rec!.ts).toBe(ts)
  })

  it('ignores non-rate-limit lines', () => {
    expect(parseLimitLine(JSON.stringify({ type: 'assistant', message: { content: [] } }))).toBeNull()
    expect(parseLimitLine('not json')).toBeNull()
  })
})

describe('calibrate5hLimit', () => {
  const mk = (ts: number, output: number) => ({
    id: `m${ts}:r`, ts, model: 'Opus', project: 'p', projectLabel: 'p',
    input: 0, output, cacheCreate: 0, cacheRead: 0
  })

  it('uses the weighted usage at the most recent hit as the limit (within clamp band)', () => {
    const hitTs = new Date(2026, 5, 18, 13, 0, 0, 0).getTime()
    // output is weighted x5; 200 output -> 1000 weighted, inside [fallback/4, fallback*4].
    const records = [mk(hitTs - 3600_000, 200), mk(hitTs - 100, 0)]
    const hits = [{ ts: hitTs, resetAt: hitTs + 5 * 3600_000, kind: 'session' as const }]
    expect(calibrate5hLimit(records, hits, 2000)).toBe(1000)
  })

  it('falls back when there are no hits', () => {
    expect(calibrate5hLimit([], [], 97_000_000)).toBe(97_000_000)
  })

  it('clamps wild calibrations to the fallback band', () => {
    const hitTs = new Date(2026, 5, 18, 13, 0, 0, 0).getTime()
    const records = [mk(hitTs - 100, 1_000_000_000)] // absurdly large
    const hits = [{ ts: hitTs, resetAt: hitTs + 1, kind: 'session' as const }]
    expect(calibrate5hLimit(records, hits, 1000)).toBe(4000) // fallback * 4
  })
})
```

- [ ] **Step 6: Run them to verify failure**

Run: `npx vitest run tests/unit/usageService.test.ts -t calibrate5hLimit`
Expected: FAIL — `calibrate5hLimit` not exported.

- [ ] **Step 7: Implement `calibrate5hLimit`**

In `src/main/services/usageService.ts`, after the `weighted()` function (around line 153), add:

```ts
/**
 * Estimate the real 5-hour budget for THIS user/machine from an observed 429: at
 * the moment the limit was hit, the weighted usage in the preceding 5-hour window
 * equals 100% of the limit. Clamp to a sane band around the plan default so a
 * fluke can't wildly distort the bar. Pure / testable.
 */
export function calibrate5hLimit(
  records: UsageRecord[],
  hits: LimitRecord[],
  fallback: number
): number {
  if (hits.length === 0) return fallback
  const hit = hits[hits.length - 1]
  const windowMs = 5 * 3_600_000
  let used = 0
  for (const r of records) {
    if (r.ts > 0 && r.ts <= hit.ts && r.ts > hit.ts - windowMs) used += weighted(r)
  }
  if (used <= 0) return fallback
  return Math.min(fallback * 4, Math.max(fallback / 4, used))
}
```

- [ ] **Step 8: Run calibration tests to verify pass**

Run: `npx vitest run tests/unit/usageService.test.ts -t calibrate5hLimit`
Expected: PASS.

- [ ] **Step 9: Fix `computeWindow` anchoring + accept a real reset override**

The observed resets land on minutes (`:40`, `:50`, `:10`), so flooring the block anchor to the hour produces a wrong reset time. Anchor the block at the first message's real timestamp, and let a 429-observed reset override the computed one.

In `src/main/services/usageService.ts`, replace the `computeWindow` signature and body. Current signature ends with `anchorUnit: 'hour' | 'day', auto = true`. Replace the whole function with:

```ts
export function computeWindow(
  records: UsageRecord[],
  now: number,
  windowMs: number,
  limit: number,
  resetOverride: number | null = null,
  auto = true
): UsageWindow {
  const sorted = records.filter((r) => r.ts > 0).sort((a, b) => a.ts - b.ts)
  interface Block {
    anchor: number
    lastTs: number
    used: number
  }
  const blocks: Block[] = []
  let cur: Block | null = null
  for (const r of sorted) {
    if (!cur || r.ts - cur.anchor >= windowMs || r.ts - cur.lastTs >= windowMs) {
      // Anchor at the first message of the block (NOT floored to the hour) so the
      // reset (anchor + windowMs) matches Claude's minute-precise reset times.
      cur = { anchor: r.ts, lastTs: r.ts, used: 0 }
      blocks.push(cur)
    }
    cur.used += weighted(r)
    cur.lastTs = r.ts
  }
  const last = blocks[blocks.length - 1]
  const active = !!last && now < last.anchor + windowMs
  const used = active ? last!.used : 0
  // Prefer a real, observed reset time when one is still in the future.
  const computedReset = active ? last!.anchor + windowMs : null
  const resetAt = resetOverride && resetOverride > now ? resetOverride : computedReset
  const safeLimit = Math.max(1, limit)
  const percentUsed = Math.min(100, Math.max(0, Math.round((used / safeLimit) * 100)))
  return {
    windowMs,
    used,
    limit: safeLimit,
    percentUsed,
    percentLeft: 100 - percentUsed,
    resetAt,
    auto
  }
}
```

- [ ] **Step 10: Thread limit hits through `buildSnapshot`**

In `src/main/services/usageService.ts`, change `buildSnapshot` to accept limit hits and use them. Replace its signature and the two `computeWindow` calls:

```ts
export function buildSnapshot(
  records: UsageRecord[],
  now: number,
  budgets: PlanBudgets = PLAN.max5x,
  limitHits: LimitRecord[] = []
): UsageSnapshot {
```

Then, inside the function, just before the `return {` block, compute the calibrated 5h limit and the active reset override:

```ts
  const limit5h = calibrate5hLimit(records, limitHits, budgets.limit5h)
  // The newest hit whose reset is still in the future pins the real 5h reset.
  const futureReset = limitHits
    .map((h) => h.resetAt)
    .filter((t) => t > now)
    .sort((a, b) => b - a)[0] ?? null
```

And change the `fiveHour` / `weekly` lines in the returned object from:

```ts
    fiveHour: computeWindow(records, now, 5 * 3_600_000, budgets.limit5h, 'hour'),
    weekly: computeWindow(records, now, 7 * DAY_MS, budgets.limitWeek, 'day'),
```

to:

```ts
    fiveHour: computeWindow(records, now, 5 * 3_600_000, limit5h, futureReset),
    weekly: computeWindow(records, now, 7 * DAY_MS, budgets.limitWeek, null),
```

- [ ] **Step 11: Collect limit hits in the scanner and pass them to `buildSnapshot`**

In `src/main/services/usageService.ts`, the live-scanning section (around line 346) currently keeps `let records: UsageRecord[] = []`. Add a parallel store and de-dupe set right after it:

```ts
let records: UsageRecord[] = []
let limitHits: LimitRecord[] = []
const seen = new Set<string>()
const seenLimits = new Set<string>()
```

In `scanOnce`, inside the `for (const line of complete.split('\n'))` loop (around line 421), after the existing `const rec = parseUsageLine(line)` handling, also parse limit lines. Replace the loop body:

```ts
    for (const line of complete.split('\n')) {
      const rec = parseUsageLine(line)
      if (rec) {
        if (rec.id === ':' || !seen.has(rec.id)) {
          if (rec.id !== ':') seen.add(rec.id)
          records.push(rec)
          changed = true
        }
      }
      const lim = parseLimitLine(line)
      if (lim) {
        const key = `${lim.ts}:${lim.resetAt}`
        if (!seenLimits.has(key)) {
          seenLimits.add(key)
          limitHits.push(lim)
          changed = true
        }
      }
    }
```

In the same `scanOnce`, where old records are trimmed (around line 431), also trim old hits:

```ts
  if (changed) {
    const keep = Date.now() - KEEP_DAYS * DAY_MS
    records = records.filter((r) => r.ts >= keep || r.ts === 0)
    limitHits = limitHits.filter((h) => h.ts >= keep)
  }
```

- [ ] **Step 12: Pass `limitHits` at every `buildSnapshot(records, ...)` call site**

In `src/main/services/usageService.ts`, update the three live call sites:

- `broadcast()` (around line 453): `buildSnapshot(records, Date.now(), currentBudgets(), limitHits)`
- `getUsageSnapshot()` (around line 465): `return buildSnapshot(records, Date.now(), currentBudgets(), limitHits)`
- `emptySnapshot()` stays `buildSnapshot([], Date.now())` (no hits — Usage off).

- [ ] **Step 13: Update the existing `computeWindow` tests for the new signature**

Existing tests in `tests/unit/usageService.test.ts` call `computeWindow(..., 'hour')` / `(..., 'day')`. Find each call and replace the trailing `'hour'` / `'day'` argument with `null` (the new `resetOverride` slot). For any test that asserted a reset time floored to the hour, update the expectation to `anchor + windowMs` using the first record's real timestamp (no flooring). Run the file to find the exact failures:

Run: `npx vitest run tests/unit/usageService.test.ts`
Expected: the new tests PASS; pre-existing `computeWindow` tests FAIL only on the signature/floored-reset change. Fix each by replacing the `'hour'`/`'day'` arg with `null` and recomputing any reset expectation as `firstRecord.ts + windowMs`.

- [ ] **Step 14: Run the full usage test file to verify all pass**

Run: `npx vitest run tests/unit/usageService.test.ts`
Expected: PASS (all).

- [ ] **Step 15: Typecheck, full test, and commit**

Run: `npm run typecheck && npm test`
Expected: no errors; all tests pass.

```bash
git add src/main/services/usageService.ts tests/unit/usageService.test.ts
git commit -m "feat(usage): anchor 5h reset to real 429 limits, self-calibrate budget, fix window anchoring"
```

- [ ] **Step 16: Manual sanity check against /status**

Run: `npm run dev`, open the Usage panel. In a terminal run Claude Code's `/status`. Confirm the 5-hour reset time now matches `/status` (to the minute) and the used-% is materially closer than before. Note in the commit/PR that exact parity remains impossible offline (documented above) — this is the best local estimate.

---

## Task 3: Eliminate the 5–10s lag when opening/splitting a terminal after `cd`

**Files:**
- Create: `src/main/services/watchPolicy.ts`
- Create: `tests/unit/watchPolicy.test.ts`
- Modify: `src/main/services/watcherService.ts`

**Interfaces:**
- Produces: `WATCH_DIR_CAP: number`, `exceedsWatchBudget(dirCount: number, cap?: number): boolean`, `countDirsBounded(root: string, cap?: number, read?: (p: string) => string[]): number`.
- Consumes: `IGNORED_ENTRIES` from `@shared/constants`.

**Root cause:** chokidar 4 dropped fsevents; on Linux it sets up one inotify watch per directory by walking the whole tree. `project:setActiveRoot` calls `retargetWatcher` on every focus/cwd change, tearing down and rebuilding that walk. After `cd ..` into a big parent (e.g. `~/Apps` holding many projects) the walk is enormous and starves the event loop, so the new tab's `pty:create`/`pty:data` messages are delayed for seconds. Fix: (a) skip live-watching trees over a directory cap, (b) debounce/coalesce retargets so they never run on the create critical path.

- [ ] **Step 1: Write failing tests for the watch policy**

Create `tests/unit/watchPolicy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { exceedsWatchBudget, countDirsBounded, WATCH_DIR_CAP } from '@main/services/watchPolicy'

describe('exceedsWatchBudget', () => {
  it('is true only above the cap', () => {
    expect(exceedsWatchBudget(WATCH_DIR_CAP, WATCH_DIR_CAP)).toBe(false)
    expect(exceedsWatchBudget(WATCH_DIR_CAP + 1, WATCH_DIR_CAP)).toBe(true)
  })
})

describe('countDirsBounded', () => {
  // Inject an in-memory tree so the test does no real I/O.
  const tree: Record<string, string[]> = {
    '/p': ['src', 'node_modules', 'a'],
    '/p/src': ['inner'],
    '/p/src/inner': [],
    '/p/a': [],
    // node_modules is huge but must be pruned and never descended into:
    '/p/node_modules': ['x', 'y', 'z']
  }
  const read = (p: string): string[] => tree[p] ?? []

  it('counts dirs but prunes IGNORED_ENTRIES (node_modules)', () => {
    // /p, /p/src, /p/src/inner, /p/a = 4 (node_modules pruned)
    expect(countDirsBounded('/p', 100, read)).toBe(4)
  })

  it('stops early once the cap is exceeded', () => {
    const big: Record<string, string[]> = { '/big': Array.from({ length: 50 }, (_, i) => `d${i}`) }
    for (let i = 0; i < 50; i++) big[`/big/d${i}`] = []
    const r = (p: string): string[] => big[p] ?? []
    expect(countDirsBounded('/big', 10, r)).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/watchPolicy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `watchPolicy.ts`**

Create `src/main/services/watchPolicy.ts`:

```ts
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { IGNORED_ENTRIES } from '@shared/constants'

/**
 * Hard cap on directories we will set up a recursive watch over. chokidar 4 has
 * no fsevents, so on Linux it creates one inotify watch per directory by walking
 * the whole tree — past a few thousand dirs that walk storms the event loop for
 * seconds and starves terminal I/O. Above the cap we simply skip live watching
 * (the file tree still works on demand; there are just no live change events).
 */
export const WATCH_DIR_CAP = 2000

export function exceedsWatchBudget(dirCount: number, cap = WATCH_DIR_CAP): boolean {
  return dirCount > cap
}

type DirReader = (p: string) => string[]

const defaultReader: DirReader = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.isSymbolicLink())
      .map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Count directories under `root`, pruning IGNORED_ENTRIES, and STOP as soon as
 * `cap` is exceeded (so a huge tree returns quickly with count > cap). `read` is
 * injectable for tests. Iterative to avoid deep-recursion on pathological trees.
 */
export function countDirsBounded(root: string, cap = WATCH_DIR_CAP, read: DirReader = defaultReader): number {
  let count = 0
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop() as string
    count++
    if (count > cap) return count
    for (const name of read(dir)) {
      if (IGNORED_ENTRIES.includes(name)) continue
      stack.push(join(dir, name))
    }
  }
  return count
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/watchPolicy.test.ts`
Expected: PASS.

- [ ] **Step 5: Debounce retarget + apply the big-tree guard in `watcherService.ts`**

In `src/main/services/watcherService.ts`, add the import at the top:

```ts
import { exceedsWatchBudget, countDirsBounded } from './watchPolicy'
```

Add a debounce constant near the top of the file (after the imports):

```ts
const RETARGET_DEBOUNCE_MS = 250
const retargetTimers = new Map<number, ReturnType<typeof setTimeout>>()
const pendingRoot = new Map<number, string>()
```

Replace the entire existing `retargetWatcher` function with a debounced front-door plus an `applyRetarget` worker that carries the original watch setup (now with the big-tree guard):

```ts
/** Point a window's watcher at `projectRoot` — debounced so rapid focus/cwd
 * changes coalesce and the heavy chokidar setup never runs on the terminal
 * create critical path. */
export function retargetWatcher(win: BrowserWindow, projectRoot: string): void {
  const id = win.webContents.id
  const existing = watches.get(id)
  if (existing && existing.root === projectRoot) return // already watching it
  pendingRoot.set(id, projectRoot)
  const prev = retargetTimers.get(id)
  if (prev) clearTimeout(prev)
  retargetTimers.set(
    id,
    setTimeout(() => {
      retargetTimers.delete(id)
      const root = pendingRoot.get(id)
      pendingRoot.delete(id)
      if (root && !win.isDestroyed()) applyRetarget(win, root)
    }, RETARGET_DEBOUNCE_MS)
  )
}

function applyRetarget(win: BrowserWindow, projectRoot: string): void {
  const id = win.webContents.id
  const existing = watches.get(id)
  if (existing && existing.root === projectRoot) return
  closeWatch(id)

  // Never recursively watch the home dir / a filesystem root, nor a tree larger
  // than the watch budget — either would walk a huge number of paths and stall
  // the app. (The file tree still works; there are just no live change events.)
  if (isTooLargeToWatch(projectRoot)) return
  if (exceedsWatchBudget(countDirsBounded(projectRoot))) return

  const watcher = watch(projectRoot, {
    ignoreInitial: true,
    followSymlinks: false,
    depth: 16,
    ignored: (p: string) => {
      const segments = p.split(/[\\/]/)
      return IGNORED_ENTRIES.some((entry) => segments.includes(entry))
    }
  })
  const w: WindowWatch = { watcher, root: projectRoot, batch: [], timer: null, sessionLog: new Set(), win }
  watches.set(id, w)

  const handler =
    (type: WatchEvent['type']) =>
    (path: string): void => {
      const relPath = relative(w.root, path).split(sep).join('/')
      if (!relPath) return
      w.batch.push({ type, relPath })
      if (type === 'add' || type === 'change' || type === 'unlink') {
        w.sessionLog.add(relPath)
        if (w.sessionLog.size > SESSION_CHANGE_LOG_CAP) {
          w.sessionLog.delete(w.sessionLog.values().next().value as string)
        }
      }
      schedule(id)
    }

  watcher
    .on('add', handler('add'))
    .on('change', handler('change'))
    .on('unlink', handler('unlink'))
    .on('addDir', handler('addDir'))
    .on('unlinkDir', handler('unlinkDir'))
}
```

- [ ] **Step 6: Clear pending retarget timers on close/stop**

In `src/main/services/watcherService.ts`, update `closeWatch` to also clear any pending debounce timer for that id, so a closing window leaves nothing scheduled. Change `closeWatch`:

```ts
function closeWatch(id: number): void {
  const t = retargetTimers.get(id)
  if (t) {
    clearTimeout(t)
    retargetTimers.delete(id)
  }
  pendingRoot.delete(id)
  const w = watches.get(id)
  if (!w) return
  void w.watcher.close()
  if (w.timer) clearTimeout(w.timer)
  watches.delete(id)
}
```

- [ ] **Step 7: Typecheck and full test**

Run: `npm run typecheck && npm test`
Expected: no errors; all tests pass.

- [ ] **Step 8: Manual lag verification**

Run: `npm run dev`. Open a large project (e.g. GlowAI-main). In one pane `cd` into a different project (e.g. dockterm), then click "new tab" and "split". Confirm the new terminal opens within a fraction of a second (no 5–10s freeze). Then `cd ..` up into a big parent directory and confirm there's no multi-second stall. (On Linux, this is the primary fix; on macOS it was already fast but stays fast.)

- [ ] **Step 9: Commit**

```bash
git add src/main/services/watchPolicy.ts tests/unit/watchPolicy.test.ts src/main/services/watcherService.ts
git commit -m "perf(watcher): debounce retarget + skip oversized trees to stop terminal-open lag"
```

---

## Task 4: Make git status follow the focused pane (fix stale "not a Git repository")

**Files:**
- Modify: `src/renderer/src/components/layout/Shell.tsx`
- Modify: `src/renderer/src/state/useAppStore.ts`

**Root cause:** `Shell.tsx` calls `useGitStore.refresh()` *before* the async `project:setActiveRoot` resolves, so git status is fetched against the previous root (a race). And the "isn't a Git repository" banner is bound to the static, first-opened `project.isGitRepo`, so it never reflects the focused pane's directory. The git store already follows the per-window active root (which is updated on focus), so the fix is to sequence the refresh and drive the banner from the live git status.

- [ ] **Step 1: Sequence the git refresh after the active root is set**

In `src/renderer/src/components/layout/Shell.tsx`, replace the effect at lines 73–79:

```tsx
  // Point the dock (files/git/…) at the focused pane's project, and refresh.
  useEffect(() => {
    if (!focusedCwd) return
    void window.dockterm.invoke('project:setActiveRoot', { path: focusedCwd }).then((res) => {
      if (res.ok) useAppStore.getState().setActiveRoot(res.value.root)
    })
    void useGitStore.getState().refresh()
  }, [focusedCwd])
```

with (refresh only after the root has actually changed in main):

```tsx
  // Point the dock (files/git/…) at the focused pane's project, then refresh git
  // — sequenced so the status is never read against the previous root (a race
  // that left the panel showing the first-opened project after a `cd`).
  useEffect(() => {
    if (!focusedCwd) return
    void window.dockterm.invoke('project:setActiveRoot', { path: focusedCwd }).then((res) => {
      if (!res.ok) return
      useAppStore.getState().setActiveRoot(res.value.root)
      void useGitStore.getState().refresh()
    })
  }, [focusedCwd])
```

- [ ] **Step 2: Drive the repo banner from the focused pane's live git status**

In `src/renderer/src/components/layout/Shell.tsx`, add a selector for the git status near the other store selectors (after line 30, `const diffTarget = ...`):

```tsx
  const gitStatus = useGitStore((s) => s.status)
  const focusedNotRepo = gitStatus?.repoState === 'not-repo'
```

Then change the banner condition at line 142 from:

```tsx
      {!project.isGitRepo && (
        <div className="banner">
          <span>This folder isn&apos;t a Git repository yet.</span>
          <button className="btn btn--ghost btn--sm" onClick={() => void initGit()}>
            <GitBranchPlus size={13} /> Initialize Git
          </button>
        </div>
      )}
```

to:

```tsx
      {focusedNotRepo && (
        <div className="banner">
          <span>This folder isn&apos;t a Git repository yet.</span>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => void initGit().then(() => useGitStore.getState().refresh())}
          >
            <GitBranchPlus size={13} /> Initialize Git
          </button>
        </div>
      )}
```

(The banner now appears/disappears with whichever directory the focused pane is in, and hides until the first git status loads since `gitStatus` is `null` initially.)

- [ ] **Step 3: Initialize Git at the focused active root, not the original project**

In `src/renderer/src/state/useAppStore.ts`, replace `initGitRepo` (lines 107–112):

```ts
  initGitRepo: async () => {
    const project = get().project
    if (!project) return
    const res = await window.dockterm.invoke('project:gitInit', { path: project.path })
    if (res.ok) set({ project: res.value })
  },
```

with:

```ts
  initGitRepo: async () => {
    // Initialize in whatever directory the focused pane is in (its resolved
    // root), falling back to the opened project.
    const root = get().activeRoot ?? get().project?.path
    if (!root) return
    const res = await window.dockterm.invoke('project:gitInit', { path: root })
    // Only refresh the opened-project info when we initialized THAT folder.
    if (res.ok && res.value.path === get().project?.path) set({ project: res.value })
  },
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Open a git project. In one pane `cd` into a different directory that IS a git repo — confirm no "not a Git repository" banner shows and the git panel shows that repo's branch/changes. `cd` into a non-git directory — confirm the banner appears; click "Initialize Git" and confirm it initializes that directory and the banner clears. Build a 2×2 grid with panes in different directories and confirm focusing each pane updates the git panel/banner to that pane's directory (not the first-opened project).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/components/layout/Shell.tsx src/renderer/src/state/useAppStore.ts
git commit -m "fix(git): follow focused pane's directory for status + repo banner"
```

---

## Task 5: Show each split terminal's live label (Claude Code OSC title)

**Files:**
- Modify: `src/renderer/src/components/terminal/terminalPool.ts`
- Modify: `src/renderer/src/components/terminal/useTerminal.ts`
- Modify: `src/renderer/src/state/useWorkspaceStore.ts`
- Modify: `src/renderer/src/components/terminal/PaneTree.tsx`

**Interfaces:**
- Produces: `TerminalOptions.onTitle?: (title: string) => void`; workspace `paneTitle: Record<string,string>` + `setPaneTitle(leafId, title)`.
- Consumes: xterm `term.onTitleChange` (OSC 0/2 — what Claude Code and shells set).

- [ ] **Step 1: Add the `onTitle` option**

In `src/renderer/src/components/terminal/useTerminal.ts`, add to the `TerminalOptions` interface (after `onCwd`, around line 30):

```ts
  /** The terminal's live title from OSC 0/2 (what Claude Code / the shell sets). */
  onTitle?: (title: string) => void
```

- [ ] **Step 2: Subscribe to `onTitleChange` in the pool**

In `src/renderer/src/components/terminal/terminalPool.ts`, right after the OSC 7 handler block (after line 160, the `})` closing `registerOscHandler`), add:

```ts
  // Track the terminal's title (OSC 0/2) so each pane can show its own label
  // (Claude Code sets this to a short task summary; shells often set the cwd).
  const titleSub = term.onTitleChange((title) => {
    if (title) p.opts.onTitle?.(title)
  })
```

Then in `p.dispose` (around line 339), add `titleSub.dispose()` alongside the other `.dispose()` calls (e.g. right after `osc7.dispose()`):

```ts
    osc7.dispose()
    titleSub.dispose()
```

- [ ] **Step 3: Add `paneTitle` state to the workspace store**

In `src/renderer/src/state/useWorkspaceStore.ts`:

In the `WorkspaceStore` interface, after `paneCwd: Record<string, string>` (line 59), add:

```ts
  /** leafId -> live terminal title (OSC 0/2). Not persisted. */
  paneTitle: Record<string, string>
```

After `setPaneCwd` in the interface (line 82), add:

```ts
  /** Record a pane's live terminal title (from OSC 0/2). */
  setPaneTitle: (leafId: string, title: string) => void
```

In the store body, add `paneTitle: {},` next to `paneCwd: {},` (line 102).

Add the action next to `setPaneCwd` (after line 287):

```ts
    setPaneTitle: (leafId, title) =>
      set((s) => (s.paneTitle[leafId] === title ? s : { paneTitle: { ...s.paneTitle, [leafId]: title } }))
```

Clean up the title on close: in `close` (around line 168), inside the `set((s) => {...})`, after the `paneCwd` cleanup add a `paneTitle` cleanup mirroring it:

```ts
        const paneTitle = { ...s.paneTitle }
        if (closing) for (const l of allLeaves(closing.layout)) delete paneTitle[l.id]
        return { activity, paneCwd, paneTitle }
```

And in `closeFocused` (around line 217), extend the cleanup `set` to also drop the title:

```ts
      set((s) => {
        const paneCwd = { ...s.paneCwd }
        const paneTitle = { ...s.paneTitle }
        delete paneCwd[closingLeafId]
        delete paneTitle[closingLeafId]
        return { paneCwd, paneTitle }
      })
```

(Replace the existing `closeFocused` cleanup block that only handled `paneCwd`.)

- [ ] **Step 4: Wire `onTitle` and show the label in `PaneTree.tsx`**

In `src/renderer/src/components/terminal/PaneTree.tsx`:

Subscribe to the live title inside `TerminalPane` (after the other store selectors, around line 43):

```tsx
  const paneTitle = useWorkspaceStore((s) => s.paneTitle[leaf.id])
```

Change the `showTitle` logic (line 132) so every split (non-root) pane shows its own label, preferring the live title:

```tsx
  // Every split (non-root) pane shows its own label: the live terminal title
  // (Claude Code / shell, via OSC 0/2) when present, else its folder name.
  const label = paneTitle ?? leaf.title
  const showTitle = !hideBar && !!label
```

Update the title-bar render (lines 141–145) to use `label`:

```tsx
      {showTitle && (
        <div className="pane__bar">
          <span className="pane__title">{label}</span>
        </div>
      )}
```

Pass the `onTitle` callback to `TerminalView` (in the `<TerminalView ... />` props, next to `onCwd` around line 193):

```tsx
          onTitle={(title) => useWorkspaceStore.getState().setPaneTitle(leaf.id, title)}
```

(`TerminalView` spreads `...options` into `useTerminal`, so `onTitle` flows through automatically once it's on `TerminalOptions`.)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`. Split a tab into a 2×2 grid. In each pane, confirm a title bar shows a label. Run Claude Code in one pane and confirm its label updates to Claude's task title (what shows in a normal terminal app's tab); run a long command in another and confirm shells that set their title (cwd/command) reflect it. `cd` between folders and confirm the label tracks.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/components/terminal/terminalPool.ts src/renderer/src/components/terminal/useTerminal.ts src/renderer/src/state/useWorkspaceStore.ts src/renderer/src/components/terminal/PaneTree.tsx
git commit -m "feat(terminal): show each split pane's live OSC title as its label"
```

---

## Task 6: Linux Ctrl+Shift+C / Ctrl+Shift+V copy & paste

**Files:**
- Create: `src/renderer/src/components/terminal/terminalKeys.ts`
- Create: `tests/unit/terminalKeys.test.ts`
- Modify: `src/renderer/src/components/terminal/terminalPool.ts`

**Interfaces:**
- Produces: `TermKeyAction` type and `resolveTermKey(e: TermKeyEvent, platform: string): TermKeyAction`.

**Why:** On Linux/Windows there is no ⌘ and plain Ctrl+C sends SIGINT, so the terminal convention is Ctrl+Shift+C/V for clipboard. The renderer can detect the OS via `document.documentElement.dataset.platform` (set by `App.tsx` from `app:getInfo` → `process.platform`), copy with `term.getSelection()` + `navigator.clipboard.writeText`, and paste with `navigator.clipboard.readText()` + the existing `p.paste`.

- [ ] **Step 1: Write failing tests for the key resolver**

Create `tests/unit/terminalKeys.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveTermKey, type TermKeyEvent } from '../../src/renderer/src/components/terminal/terminalKeys'

const ev = (p: Partial<TermKeyEvent>): TermKeyEvent => ({
  type: 'keydown', key: '', code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...p
})

describe('resolveTermKey', () => {
  it('keeps macOS Cmd+Up/Down scroll jumps', () => {
    expect(resolveTermKey(ev({ metaKey: true, key: 'ArrowDown' }), 'darwin')).toBe('scroll-bottom')
    expect(resolveTermKey(ev({ metaKey: true, key: 'ArrowUp' }), 'darwin')).toBe('scroll-top')
  })

  it('keeps Shift+PageUp/Down paging on every platform', () => {
    expect(resolveTermKey(ev({ shiftKey: true, key: 'PageUp' }), 'linux')).toBe('page-up')
    expect(resolveTermKey(ev({ shiftKey: true, key: 'PageDown' }), 'linux')).toBe('page-down')
  })

  it('maps Ctrl+Shift+C/V to copy/paste on Linux and Windows', () => {
    expect(resolveTermKey(ev({ ctrlKey: true, shiftKey: true, code: 'KeyC' }), 'linux')).toBe('copy')
    expect(resolveTermKey(ev({ ctrlKey: true, shiftKey: true, code: 'KeyV' }), 'win32')).toBe('paste')
  })

  it('does NOT hijack Ctrl+Shift+C on macOS (Cmd+C is native there)', () => {
    expect(resolveTermKey(ev({ ctrlKey: true, shiftKey: true, code: 'KeyC' }), 'darwin')).toBeNull()
  })

  it('lets plain Ctrl+C (SIGINT) and other keys through', () => {
    expect(resolveTermKey(ev({ ctrlKey: true, code: 'KeyC' }), 'linux')).toBeNull()
    expect(resolveTermKey(ev({ key: 'a' }), 'linux')).toBeNull()
  })

  it('ignores non-keydown events', () => {
    expect(resolveTermKey(ev({ type: 'keyup', ctrlKey: true, shiftKey: true, code: 'KeyC' }), 'linux')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/unit/terminalKeys.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `terminalKeys.ts`**

Create `src/renderer/src/components/terminal/terminalKeys.ts`:

```ts
export type TermKeyAction =
  | 'scroll-bottom'
  | 'scroll-top'
  | 'page-up'
  | 'page-down'
  | 'copy'
  | 'paste'
  | null

/** The subset of KeyboardEvent fields the resolver needs (so it's pure/testable). */
export interface TermKeyEvent {
  type: string
  key: string
  code?: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/**
 * Decide what a keydown should do INSIDE the terminal, returning null to let the
 * key pass through to the shell. Pure so it can be unit-tested.
 *
 * - macOS uses ⌘ for scroll jumps and native ⌘C/⌘V (handled by the OS, so we
 *   never intercept clipboard keys on darwin).
 * - Linux/Windows have no ⌘ and Ctrl+C is SIGINT, so the convention is
 *   Ctrl+Shift+C / Ctrl+Shift+V for copy / paste.
 */
export function resolveTermKey(e: TermKeyEvent, platform: string): TermKeyAction {
  if (e.type !== 'keydown') return null
  if (e.metaKey && e.key === 'ArrowDown') return 'scroll-bottom'
  if (e.metaKey && e.key === 'ArrowUp') return 'scroll-top'
  if (e.shiftKey && e.key === 'PageUp') return 'page-up'
  if (e.shiftKey && e.key === 'PageDown') return 'page-down'
  if (platform !== 'darwin' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
    if (e.code === 'KeyC' || e.key === 'C' || e.key === 'c') return 'copy'
    if (e.code === 'KeyV' || e.key === 'V' || e.key === 'v') return 'paste'
  }
  return null
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/unit/terminalKeys.test.ts`
Expected: PASS.

- [ ] **Step 5: Use the resolver in the pool's key handler**

In `src/renderer/src/components/terminal/terminalPool.ts`, add the import near the other terminal imports (top of file):

```ts
import { resolveTermKey } from './terminalKeys'
```

Replace the entire `term.attachCustomKeyEventHandler((e) => { ... })` block (lines 184–203) with:

```ts
  // Scroll/clipboard shortcuts (intercepted, not sent to the shell). Pure key
  // mapping lives in terminalKeys.ts; here we just perform the chosen action.
  const platform = document.documentElement.dataset.platform ?? ''
  term.attachCustomKeyEventHandler((e) => {
    const action = resolveTermKey(e, platform)
    if (!action) return true
    switch (action) {
      case 'scroll-bottom':
        term.scrollToBottom()
        return false
      case 'scroll-top':
        term.scrollToTop()
        return false
      case 'page-up':
        term.scrollPages(-1)
        return false
      case 'page-down':
        term.scrollPages(1)
        return false
      case 'copy': {
        const sel = term.getSelection()
        if (sel) void navigator.clipboard.writeText(sel)
        return false
      }
      case 'paste':
        void navigator.clipboard
          .readText()
          .then((text) => {
            if (text) p.paste(text)
          })
          .catch(() => {
            // clipboard read denied / empty — nothing to paste
          })
        return false
    }
    return true
  })
```

- [ ] **Step 6: Typecheck and full test**

Run: `npm run typecheck && npm test`
Expected: no errors; all tests pass.

- [ ] **Step 7: Manual verification (Linux)**

On Linux, run `npm run dev`, select terminal text, press Ctrl+Shift+C, then Ctrl+Shift+V in the same or another pane — confirm the selection copies and pastes. Confirm plain Ctrl+C still interrupts a running process (SIGINT). On macOS, confirm ⌘C/⌘V still work and Ctrl+Shift+C does nothing unusual.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/components/terminal/terminalKeys.ts tests/unit/terminalKeys.test.ts src/renderer/src/components/terminal/terminalPool.ts
git commit -m "feat(terminal): support Linux/Windows Ctrl+Shift+C/V copy & paste"
```

---

## Task 7: Fix random terminal character corruption ("letters on letters")

**Files:**
- Modify: `src/renderer/src/components/terminal/terminalPool.ts`

**Root causes (evidence-based):**
1. **WebGL context loss is not recovered.** The addon's `onContextLoss` only calls `dispose()` and never reloads, so after the browser drops the WebGL context (common after the host is detached/reattached across DockTerm's pane re-mounts, or on GPU pressure) the renderer is left degraded — producing overlapping/ghosted glyphs. The documented fix is to dispose **and reattach** a fresh addon.
2. **Glyph overlap.** xterm 6 exposes `rescaleOverlappingGlyphs` to conservatively rescale glyphs that bleed into the next cell.
3. **Initial PTY size race.** The PTY is created with `term.cols/term.rows` while the host is still detached (default 80×24), then resized after the first fit. Claude Code's full-screen TUI redraws with absolute cursor positioning at the wrong width during that window → overprint. Creating the PTY only after the first real fit removes the race.

- [ ] **Step 1: Enable overlap rescaling on the terminal**

In `src/renderer/src/components/terminal/terminalPool.ts`, in the `new Terminal({ ... })` options (around lines 97–118), add after `allowProposedApi: true,`:

```ts
    // Conservatively rescale glyphs that would overlap the next cell — prevents
    // the "letters printed on letters" artifact under GPU acceleration.
    rescaleOverlappingGlyphs: true,
```

- [ ] **Step 2: Recover from WebGL context loss by reloading the addon**

In `src/renderer/src/components/terminal/terminalPool.ts`, replace the WebGL block (lines 206–218):

```ts
  // WebGL is loaded lazily on first attach (it needs the canvas in the DOM with
  // real dimensions); falls back to the DOM renderer if unavailable.
  let webglTried = false
  const tryWebgl = (): void => {
    if (webglTried || (opts.renderer ?? 'auto') !== 'auto') return
    webglTried = true
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => webgl.dispose())
      term.loadAddon(webgl)
    } catch {
      // WebGL unavailable -> DOM renderer
    }
  }
```

with:

```ts
  // WebGL is loaded lazily on first attach (it needs the canvas in the DOM with
  // real dimensions); falls back to the DOM renderer if unavailable. On context
  // loss we dispose AND reload a fresh addon next frame, otherwise the renderer
  // stays degraded and prints garbled / overlapping glyphs.
  let webglTried = false
  let webglAddon: WebglAddon | null = null
  const loadWebgl = (): void => {
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => {
        webgl.dispose()
        if (webglAddon === webgl) webglAddon = null
        requestAnimationFrame(() => {
          if (host.clientWidth > 0 && host.clientHeight > 0) loadWebgl()
        })
      })
      term.loadAddon(webgl)
      webglAddon = webgl
    } catch {
      // WebGL unavailable -> DOM renderer
    }
  }
  const tryWebgl = (): void => {
    if (webglTried || (opts.renderer ?? 'auto') !== 'auto') return
    webglTried = true
    loadWebgl()
  }
```

- [ ] **Step 3: Create the PTY at the correctly-fitted size (after first fit)**

In `src/renderer/src/components/terminal/terminalPool.ts`, the PTY is currently created eagerly in `createPooled` (lines 303–320). Wrap that creation in a one-shot `startPty()` and trigger it from `attach` after the first fit.

Replace the eager creation block (lines 303–320, the `void window.dockterm.invoke('pty:create', ...).then(...)`) with a function definition:

```ts
  let ptyStarted = false
  const startPty = (): void => {
    if (ptyStarted) return
    ptyStarted = true
    void window.dockterm
      .invoke('pty:create', { kind: opts.kind, cols: term.cols, rows: term.rows, cwd: opts.cwd })
      .then((res) => {
        if (!res.ok) {
          term.writeln(`\x1b[31mFailed to start shell: ${res.error.message}\x1b[0m`)
          return
        }
        sessionId = res.value.sessionId
        for (const e of pending) {
          if (e.sessionId === sessionId) writeChunk(e.data)
        }
        pending.length = 0
        if (pasteQueue) {
          void window.dockterm.invoke('pty:write', { sessionId, data: pasteQueue })
          pasteQueue = ''
        }
        term.focus()
      })
  }
```

Then update `p.attach` (lines 322–326) to fit first, then start the PTY at the fitted size:

```ts
  p.attach = (container) => {
    container.appendChild(host)
    tryWebgl()
    requestAnimationFrame(() => {
      safeFit()
      // Start the shell at the fitted size so Claude's TUI never redraws at the
      // wrong width (the 80×24 default → real-size resize race that garbles output).
      startPty()
    })
  }
```

(Note: `sessionId`, `pending`, `pasteQueue`, `writeChunk` are already declared above this point in `createPooled`, so `startPty` closes over them unchanged. The `onData`/`onExit`/`onResize` subscriptions defined between the old creation block and `p.attach` remain exactly where they are.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`. Open several terminals, split into a grid, run Claude Code in one and let it render its TUI heavily. Repeatedly switch tabs (detach/reattach), resize the window, and split/close panes. Confirm there is no overlapping/garbled text and that newly opened/split terminals render at the correct width immediately (no momentary garbled prompt). If corruption still reproduces on a specific GPU, set the terminal renderer to `dom` in Settings to confirm it's the WebGL path, and capture the GPU/driver for a follow-up.

- [ ] **Step 6: Build and commit**

Run: `npm run build`
Expected: production bundles build with no errors.

```bash
git add src/renderer/src/components/terminal/terminalPool.ts
git commit -m "fix(terminal): recover WebGL context, rescale overlapping glyphs, create PTY at fitted size"
```

---

## Final gate

- [ ] **Run the full release gate**

Run: `npm run typecheck && npm test && npm run build`
Expected: all three pass.

- [ ] **Optional: bump version + release notes** (only if shipping)

Follow CLAUDE.md "Releasing": bump `version` in `package.json`, update `.github/RELEASE_NOTES.md` "What's new", commit, push a `v*` tag.

---

## Self-Review

**1. Spec coverage:**
- Split-grid popup clipping → Task 1. ✓
- Usage not showing correctly (study claude-counter, fix ours) → Task 2 + Background section. ✓
- 5–10s lag opening/splitting after `cd` / on `cd ..` → Task 3. ✓
- Stale "git not initialized" / wrong (first-project) directory across panes → Task 4. ✓
- Per-split terminal labels (Claude Code OSC title) → Task 5. ✓
- Linux Ctrl+Shift+C/V copy/paste → Task 6. ✓
- Random terminal symbol corruption → Task 7. ✓

**2. Placeholder scan:** No TBD/TODO/"add appropriate handling"/"similar to Task N". Every code step shows the actual code. ✓

**3. Type consistency:** `LimitRecord`, `parseLimitLine`, `parseResetClock`, `calibrate5hLimit` used consistently in Task 2; `computeWindow`/`buildSnapshot` signature changes are propagated to all call sites and existing tests (Steps 9–13). `resolveTermKey`/`TermKeyEvent`/`TermKeyAction` consistent in Task 6. `paneTitle`/`setPaneTitle`/`onTitle` consistent across store, options, pool, and PaneTree in Task 5. `exceedsWatchBudget`/`countDirsBounded`/`WATCH_DIR_CAP` consistent in Task 3. ✓

**Note on scope honesty:** Task 2 explicitly cannot achieve exact `/status` parity offline (no utilization data exists in local transcripts — confirmed). It delivers the best local accuracy via real 429 reset anchoring + per-user budget self-calibration + a genuine window-anchoring bug fix, and the manual step compares against `/status`.
