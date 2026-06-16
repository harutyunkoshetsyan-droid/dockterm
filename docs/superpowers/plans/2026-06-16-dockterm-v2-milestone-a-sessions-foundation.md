# DockTerm V2 · Milestone A — Sessions Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple terminals and the project-scoped panels from a single global project, so different windows/panes can target different projects at once — with no visible change to the current single-terminal UI.

**Architecture:** Replace the global `projectContext` root with a per-`webContents` **active-root registry**: the renderer declares its active project once via `project:setActiveRoot`, and every project-scoped handler resolves the caller's root with `rootFor(event)`. Project-scoped services gain an explicit `root` parameter. The chokidar watcher becomes per-window and retargets when the active root changes. A pure `resolveProjectRoot(cwd)` helper maps any terminal cwd to its project root.

**Tech Stack:** Electron 42 main process (Node), TypeScript (strict), vitest. Existing services: `ptyService`, `fileService`, `gitService`, `claudeConfigService`, `watcherService`, `projectService`, `projectInfoService`. IPC contract in `src/shared/ipc.ts`.

**Spec:** `docs/superpowers/specs/2026-06-16-dockterm-v2-design.md` §3.

---

## File structure (created / modified in this milestone)

- Create `src/main/services/projectResolve.ts` — pure `resolveProjectRoot(cwd)`.
- Create `src/main/services/projectResolve.test.ts` — unit tests.
- Create `src/main/services/activeRoot.ts` — per-`webContents` active-root registry + `rootFor(event)`.
- Create `src/main/services/activeRoot.test.ts` — unit tests for the registry.
- Modify `src/main/services/projectContext.ts` — delete (its single global root is replaced).
- Modify `src/main/services/fileService.ts` — every export takes `root` as first arg.
- Modify `src/main/services/gitService.ts` — `git(root)` + every export takes `root`.
- Modify `src/main/services/claudeConfigService.ts` — `readMcp`/`createMcpTemplate` take `root`.
- Modify `src/main/services/projectInfoService.ts` — `getProjectInfo(root)` (find exact name in step).
- Modify `src/main/services/watcherService.ts` — keyed by `webContents`; add `retargetWatcher`.
- Modify `src/main/ipc/handlers/*.ts` — resolve `rootFor(event)` and pass to services.
- Modify `src/shared/ipc.ts` — add `project:setActiveRoot` channel (+ allowlist).
- Modify `src/main/services/ptyService.ts` — bind sessions to `webContents.id`; kill per window.
- Modify `src/renderer/src/state/useAppStore.ts` — call `project:setActiveRoot` on open.

---

## Task 1: `resolveProjectRoot(cwd)` pure helper

A terminal's cwd may be anywhere; the dock needs its *project* root (nearest `.git`, else nearest dir with a project manifest, else the cwd itself).

**Files:**
- Create: `src/main/services/projectResolve.ts`
- Test: `src/main/services/projectResolve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveProjectRoot } from './projectResolve'

describe('resolveProjectRoot', () => {
  it('returns the nearest ancestor containing .git', () => {
    const base = mkdtempSync(join(tmpdir(), 'dt-'))
    mkdirSync(join(base, '.git'))
    const deep = join(base, 'src', 'a', 'b')
    mkdirSync(deep, { recursive: true })
    expect(resolveProjectRoot(deep)).toBe(base)
    rmSync(base, { recursive: true, force: true })
  })

  it('falls back to nearest package.json when no .git', () => {
    const base = mkdtempSync(join(tmpdir(), 'dt-'))
    writeFileSync(join(base, 'package.json'), '{}')
    const deep = join(base, 'pkg', 'x')
    mkdirSync(deep, { recursive: true })
    expect(resolveProjectRoot(deep)).toBe(base)
    rmSync(base, { recursive: true, force: true })
  })

  it('falls back to the cwd itself when nothing is found', () => {
    const base = mkdtempSync(join(tmpdir(), 'dt-'))
    expect(resolveProjectRoot(base)).toBe(base)
    rmSync(base, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/main/services/projectResolve.test.ts`
Expected: FAIL — `Cannot find module './projectResolve'`.

- [ ] **Step 3: Implement the helper**

```ts
// src/main/services/projectResolve.ts
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

const MANIFESTS = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml']

/** Maps a terminal's cwd to its project root: nearest ancestor with `.git`,
 * else nearest ancestor with a known manifest, else the cwd itself. */
export function resolveProjectRoot(cwd: string): string {
  let manifestHit: string | null = null
  let dir = cwd
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir
    if (!manifestHit && MANIFESTS.some((m) => existsSync(join(dir, m)))) manifestHit = dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return manifestHit ?? cwd
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/main/services/projectResolve.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/services/projectResolve.ts src/main/services/projectResolve.test.ts
git commit -m "feat(main): resolveProjectRoot helper for per-terminal project context"
```

---

## Task 2: Active-root registry keyed by `webContents`

Each renderer (window) declares which project its project-scoped calls target. Handlers read it via `rootFor(event)`. Keyed by `webContents.id` so windows are independent.

**Files:**
- Create: `src/main/services/activeRoot.ts`
- Test: `src/main/services/activeRoot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { setActiveRoot, getActiveRoot, clearActiveRoot } from './activeRoot'

describe('activeRoot registry', () => {
  it('stores and returns a root per webContents id', () => {
    setActiveRoot(1, '/a')
    setActiveRoot(2, '/b')
    expect(getActiveRoot(1)).toBe('/a')
    expect(getActiveRoot(2)).toBe('/b')
  })

  it('throws when no root is set for an id', () => {
    expect(() => getActiveRoot(999)).toThrow(/no active project/i)
  })

  it('clears a webContents entry', () => {
    setActiveRoot(3, '/c')
    clearActiveRoot(3)
    expect(() => getActiveRoot(3)).toThrow()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/main/services/activeRoot.test.ts`
Expected: FAIL — `Cannot find module './activeRoot'`.

- [ ] **Step 3: Implement the registry + `rootFor`**

```ts
// src/main/services/activeRoot.ts
import type { IpcMainInvokeEvent } from 'electron'

const roots = new Map<number, string>()

export function setActiveRoot(webContentsId: number, root: string): void {
  roots.set(webContentsId, root)
}

export function getActiveRoot(webContentsId: number): string {
  const root = roots.get(webContentsId)
  if (!root) throw new Error('No active project for this window')
  return root
}

export function clearActiveRoot(webContentsId: number): void {
  roots.delete(webContentsId)
}

/** Resolve the active project root for the window that sent an IPC request. */
export function rootFor(event: IpcMainInvokeEvent): string {
  return getActiveRoot(event.sender.id)
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/main/services/activeRoot.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/services/activeRoot.ts src/main/services/activeRoot.test.ts
git commit -m "feat(main): per-webContents active-root registry"
```

---

## Task 3: Add the `project:setActiveRoot` IPC channel

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/main/ipc/handlers/project.ts`

- [ ] **Step 1: Add the channel to the contract**

In `src/shared/ipc.ts`, inside `InvokeChannels` (next to the other `project:*` entries) add:

```ts
  'project:setActiveRoot': (req: PathReq) => Result<void>
```

and add `'project:setActiveRoot'` to the `INVOKE_CHANNELS` array (after `'project:gitInit'`).

- [ ] **Step 2: Implement the handler**

In `src/main/ipc/handlers/project.ts`, import the registry and register the handler inside `registerProjectHandlers`:

```ts
import { setActiveRoot } from '../../services/activeRoot'
// ...
  reg('project:setActiveRoot', pathSchema, (req, event) => {
    setActiveRoot(event.sender.id, req.path)
    return ok(undefined)
  })
```

(`pathSchema` already exists in that file as `z.object({ path: z.string().min(1).max(4096) })`.)

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (the new channel is wired into both maps).

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc.ts src/main/ipc/handlers/project.ts
git commit -m "feat(ipc): project:setActiveRoot channel"
```

---

## Task 4: `fileService` takes an explicit `root`

**Files:**
- Modify: `src/main/services/fileService.ts`
- (Path-jail) the existing `resolveInside(root, relPath)` helper already takes a root; we just stop sourcing the root from the global context.

- [ ] **Step 1: Change every exported function to accept `root` first**

For each exported function in `fileService.ts` (`readTree`, `readFile`, `writeFile`, `createFile`, `createDir`, `rename`, `del`/`delete`, `reveal` — match the actual names in the file), replace the internal `getProjectRoot()` call with a `root: string` parameter. Example for `readTree`:

```ts
// before:  export async function readTree(relPath: string) { const root = getProjectRoot(); ... }
// after:
export async function readTree(root: string, relPath: string): Promise<TreeNode[]> {
  const abs = relPath ? resolveInside(root, relPath) : root
  // ...unchanged body, using `root` instead of getProjectRoot()...
}
```

Apply the identical transformation (add `root: string` as the first parameter; replace `getProjectRoot()` with `root`) to **every** exported function in the file. Remove the now-unused `import { getProjectRoot } from './projectContext'`.

- [ ] **Step 2: Typecheck to find all call sites**

Run: `npm run typecheck`
Expected: FAIL — errors at each handler that calls these functions without `root`. That list is your Task 7 checklist. Do not fix callers yet; proceed to Task 5/6 first, then fix all callers in Task 7.

- [ ] **Step 3: Commit (service only)**

```bash
git add src/main/services/fileService.ts
git commit -m "refactor(main): fileService takes explicit project root"
```

---

## Task 5: `gitService` takes an explicit `root`

**Files:**
- Modify: `src/main/services/gitService.ts`

- [ ] **Step 1: Thread `root` through `git()` and every export**

Change the private factory and every exported function:

```ts
// before: function git(): SimpleGit { return simpleGit({ baseDir: getProjectRoot(), ... }) }
// after:
function git(root: string): SimpleGit {
  return simpleGit({
    baseDir: root,
    config: ['core.hooksPath='],
    unsafe: { allowUnsafeHooksPath: true },
    trimmed: true,
    timeout: { block: 120_000 }
  })
}
```

Then add `root: string` as the first parameter of every exported function and pass it into `git(root)` (and into nested helpers that currently call `git()` / `getProjectRoot()` — e.g. `getStatus`, `changedSince`, `diffFile`, `stage`, `commit`, `push`, `pull`, `branches`, etc.). Remove the `getProjectRoot` import.

- [ ] **Step 2: Typecheck (expect caller errors)**

Run: `npm run typecheck`
Expected: FAIL at git handlers (fixed in Task 7).

- [ ] **Step 3: Commit (service only)**

```bash
git add src/main/services/gitService.ts
git commit -m "refactor(main): gitService takes explicit project root"
```

---

## Task 6: `claudeConfigService`, `projectInfoService` take `root`; delete `projectContext`

**Files:**
- Modify: `src/main/services/claudeConfigService.ts`
- Modify: `src/main/services/projectInfoService.ts` (confirm filename via `git ls-files src/main/services | grep -i info`)
- Delete: `src/main/services/projectContext.ts`

- [ ] **Step 1: `claudeConfigService`**

Change signatures to take `root` instead of calling `getProjectRoot()`:

```ts
export function readMcp(root: string, includeUser: boolean): McpReadResult {
  const sources: McpSource[] = []
  const servers: McpServerView[] = []
  readInto(join(root, '.mcp.json'), 'project', sources, servers)
  if (includeUser) readUserConfig(join(homedir(), '.claude.json'), root, sources, servers)
  return { servers, sources }
}

export function createMcpTemplate(root: string): string {
  const file = join(root, '.mcp.json')
  if (existsSync(file)) throw new Error('.mcp.json already exists')
  writeFileSync(file, MCP_TEMPLATE, { flag: 'wx' })
  return '.mcp.json'
}
```

Remove the `getProjectRoot` import. (`readUserConfig` already takes `projectRoot`.)

- [ ] **Step 2: `projectInfoService`**

Change its exported entry point to take `root: string` instead of `getProjectRoot()` (e.g. `export async function getProjectInfo(root: string): Promise<ProjectInfoData>`). Replace internal `getProjectRoot()` usages with `root`. Remove the import.

- [ ] **Step 3: Delete the global context module**

```bash
git rm src/main/services/projectContext.ts
```

- [ ] **Step 4: Typecheck (expect caller errors only)**

Run: `npm run typecheck`
Expected: FAIL only at handler call sites and any remaining `projectContext` importers — all addressed in Task 7.

- [ ] **Step 5: Commit**

```bash
git add -A src/main/services/claudeConfigService.ts src/main/services/projectInfoService.ts
git commit -m "refactor(main): claudeConfig & projectInfo take root; drop global projectContext"
```

---

## Task 7: Update all handlers to resolve `rootFor(event)`

Every project-scoped handler now reads the caller's active root and passes it to the service. The `reg(...)` callback signature is `(req, event) => ...` (see `project.ts`).

**Files:**
- Modify: `src/main/ipc/handlers/files.ts`, `git.ts`, `review.ts`, `claude.ts`, `info.ts`, and any other handler that previously relied on `getProjectRoot()` (the Task 4–6 typecheck output is the exact list).

- [ ] **Step 1: Apply the pattern to every failing handler**

Import `rootFor` and resolve at the top of each handler, then pass it as the new first arg. Example (files):

```ts
import { rootFor } from '../../services/activeRoot'
// ...
  reg('fs:readTree', relPathSchema, (req, event) => {
    return ok(readTreeService(rootFor(event), req.relPath))   // await as appropriate
  })
```

Do this for **every** handler the typecheck flagged: all `fs:*`, all `git:*`, `review:*` (`review:list`, `review:diffFile`, `checkpoint:create`, `checkpoint:get`), `claude:mcpRead`/`claude:mcpCreateTemplate`/`claude:skillsRead`/`claude:skillCreate`, and `info:get`. Each gains `const root = rootFor(event)` (or inline `rootFor(event)`) passed as the service's first argument. Wrap in the existing `try/catch → err(...)` shape already used in each handler.

- [ ] **Step 2: Typecheck until clean**

Run: `npm run typecheck`
Expected: PASS (no remaining references to `getProjectRoot`; grep to be sure):
`grep -rn "getProjectRoot\|projectContext" src` → no results.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (existing 38+ tests, plus the new projectResolve/activeRoot tests).

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc/handlers
git commit -m "refactor(main): handlers resolve active root via rootFor(event)"
```

---

## Task 8: Watcher becomes per-window with `retargetWatcher`

**Files:**
- Modify: `src/main/services/watcherService.ts`
- Modify: `src/main/ipc/handlers/project.ts` (start/retarget on setActiveRoot)
- Modify: `src/shared/ipc.ts` is **not** needed — retarget piggybacks on `project:setActiveRoot`.

- [ ] **Step 1: Key the watcher by webContents**

Change `watcherService` from a single module-level watcher to a `Map<number, FSWatcher>` keyed by `webContents.id`. Replace `startWatching(projectRoot, win)` with:

```ts
export function retargetWatcher(win: BrowserWindow, root: string): void {
  const id = win.webContents.id
  closeWatcher(id)                 // close existing for this window, if any
  // ...existing chokidar.watch(root, { ignoreInitial, depth:99, ignored }) ...
  // store in the map under id; send 'fs:watch' batches only to `win`
}
export function stopWatching(win: BrowserWindow): void { closeWatcher(win.webContents.id) }
export function stopAllWatchers(): void { /* close every entry */ }
```

The `ignored`/debounce/`sessionLog` logic is unchanged; `sessionLog` becomes per-id (a `Map<number, Set<string>>`) so `getSessionChanges` takes the window id.

- [ ] **Step 2: Drive it from `project:setActiveRoot`**

In `project.ts`, when `setActiveRoot` runs, also retarget the watcher for that window:

```ts
  reg('project:setActiveRoot', pathSchema, (req, event) => {
    setActiveRoot(event.sender.id, req.path)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) retargetWatcher(win, req.path)
    return ok(undefined)
  })
```

Remove the old `startWatching(info.path, win)` call from `project:open` (the renderer will call `setActiveRoot` after open — Task 9).

- [ ] **Step 3: Fix lifecycle teardown**

In `src/main/index.ts`, replace `stopWatching()` calls in `before-quit`/`window-all-closed` with `stopAllWatchers()`. In `ptyService` window cleanup (Task 9) also `stopWatching(win)`.

- [ ] **Step 4: Typecheck + test**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/watcherService.ts src/main/ipc/handlers/project.ts src/main/index.ts
git commit -m "refactor(main): per-window file watcher with retarget"
```

---

## Task 9: PTY sessions bound to `webContents`; per-window cleanup

**Files:**
- Modify: `src/main/services/ptyService.ts`

- [ ] **Step 1: Bind sessions to the sender's webContents id**

In `createPty`, accept the owning `BrowserWindow` (already passed) but store `ownerId = win.webContents.id`. Add a helper to route + to kill by window:

```ts
export function killPtysForWindow(webContentsId: number): void {
  for (const [id, s] of sessions) if (s.ownerId === webContentsId) killPty(id)
}
```

Keep `session.win` for `webContents.send`, but guard every send with `if (!session.win.isDestroyed())` (already present). `cwd` is already honored (`createPty` falls back to `homedir()` when missing/invalid) — no change needed there.

- [ ] **Step 2: Call cleanup when a window closes**

In `src/main/window.ts` (or wherever windows are created), on the window's `'closed'` event call `killPtysForWindow(id)` and `stopWatching(win)` and `clearActiveRoot(id)`.

- [ ] **Step 3: Typecheck + test**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/main/services/ptyService.ts src/main/window.ts
git commit -m "refactor(main): bind PTY sessions to window; per-window cleanup"
```

---

## Task 10: Renderer declares its active root on project open

Keeps the current single-terminal UI working end-to-end with the new model.

**Files:**
- Modify: `src/renderer/src/state/useAppStore.ts`

- [ ] **Step 1: Call `setActiveRoot` whenever a project becomes active**

In `useAppStore`, after a successful `project:open` (both in `init`'s last-project restore and in `openProject`), call:

```ts
await window.dockterm.invoke('project:setActiveRoot', { path: res.value.path })
```

before any code that triggers dock fetches (git refresh, file tree). This guarantees `rootFor(event)` resolves for the window.

- [ ] **Step 2: Manual smoke test (dev)**

Run: `npm run dev`
Expected: app opens the last project; terminal starts; Files panel lists files; Git panel shows status; MCP/Skills/Info panels populate — all identical to before. (If a panel errors "No active project", the `setActiveRoot` call is firing too late — move it earlier.)

- [ ] **Step 3: Typecheck + test + commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/state/useAppStore.ts
git commit -m "feat(renderer): declare active project root to main on open"
```

---

## Self-Review

**Spec coverage (spec §3):** §3.1 sessions decoupled (Task 9, cwd already honored) ✓; §3.2 per-call root via registry (Tasks 2–7) ✓ — note we resolve root per-window via `rootFor(event)` rather than per-payload, an equivalent, less invasive realization of "per-call root"; §3.3 watcher follows focus / per window (Task 8) ✓ (focus-driven retarget arrives with Milestone C; for now it retargets on project open); §3.4 window cleanup hooks (Task 9) ✓. `resolveProjectRoot` (Task 1) is built now and consumed in Milestone C when panes carry their own cwd.

**Placeholder scan:** Tasks 4–7 intentionally say "apply the identical transformation to every export/handler" for a mechanical, type-checker-guided refactor — the exact list is produced by `npm run typecheck` in each task, and the transformation is shown in full. No vague "add error handling"/"TBD" steps remain.

**Type consistency:** `rootFor(event)`, `setActiveRoot(id, root)`, `getActiveRoot(id)`, `clearActiveRoot(id)`, `resolveProjectRoot(cwd)`, `retargetWatcher(win, root)`, `stopWatching(win)`, `stopAllWatchers()`, `killPtysForWindow(id)` — names used consistently across tasks.

**Note for executor:** filenames for `projectInfoService` and the exact `fileService`/`gitService` export names must be confirmed against the working tree in their tasks (commands given). This milestone is "no visible change"; its done-definition is green `typecheck` + `test` + a dev smoke test where every panel still works.
