# DockTerm V1 — /ultraplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan milestone-by-milestone. At the start of each milestone, generate its detailed task file (`docs/plans/M<N>-<name>.md`) at writing-plans granularity (failing test → run → implement → run → commit), using the interfaces locked in this document. Steps use checkbox syntax for tracking.

**Goal:** Ship DockTerm V1 — a terminal-first Electron workspace for Claude Code users (hero terminal + on-demand dock: files, editor, safe Git, diff/review with checkpoints, MCP & Skills inspectors) — running on the Windows 11 dev machine and macOS, published as public GitHub repo `dockterm`.

**Architecture:** Hardened Electron 42 (sandboxed renderer, verb-only zod-validated IPC, fs jail, `app://` prod protocol). All capability lives in main-process services (pty/fs/git/watcher/config/claude-inspection); renderer is pure React UI driven by a zustand store; preload is a frozen typed bridge. Every git call neutralizes repo hooks; MCP/skills panels parse-and-mask, never execute.

**Tech Stack:** Electron 42 · electron-vite 5 · electron-builder 26 · React 18 + TypeScript strict · @xterm/xterm 5.5 + node-pty 1.2-beta · monaco-editor (local) · simple-git 3.36+ · chokidar (followSymlinks:false) · zustand · zod · cmdk · react-resizable-panels · lucide-react · custom CSS tokens · Vitest 4 + Playwright `_electron`.

**Decision inputs:** `docs/BRAINSTORM.md`, `docs/decisions/ADR-001..008`, `docs/research/01..10`.

---

## 1. Product summary

DockTerm is the terminal workspace Claude Code always assumed you had. You run `claude` in a real terminal that stays the hero; DockTerm watches the project and Git, lights up what changed, lets you review diffs and commit safely, and shows your MCP servers and skills honestly (masked, parse-only). It is not an IDE and never calls an AI API. Privacy is structural: no telemetry, no accounts, no cloud — *not opt-out, just absent.*

**Positioning fence (anti-bloat rules):** terminal never unmounts and is never visually subordinate · one dock panel at a time · no LSP/extensions/AI-chat/tabs-splits-SSH · nothing executes without being visible or confirmed · any feature that needs a server doesn't ship.

## 2. Final V1 scope

**Must:** project open/reopen + empty state + git detection (+ confirmed `git init`) · main terminal (Claude Code TUI-proof) · mini terminal (Cmd/Ctrl+Shift+J) · file tree (ignores, git badges, CRUD with trash + confirm) · Monaco editor (tabs, dirty dots, save with mtime conflict guard, binary/huge block) · Git panel (grouped status, stage/unstage/discard, commit modal, push/pull, branch create/switch/delete-merged, upstream publish flow, Beginner Git Mode, danger matrix per ADR-004) · Review panel (baselines: last commit / checkpoint / session; Monaco diff; stage/commit from review) · checkpoints (single active, git-hash based) · top-bar status chip (Clean / N changed / Review suggested) · MCP panel (ADR-005 parse-only tiers + masking + template) · Skills panel (project default, user opt-in, create-from-template) · command palette (cmdk) · settings (fonts, cursor, accent, beginner mode, confirmations, user-config opt-in, renderer, reset layout) · platform-true shortcuts · docs + public repo.

**Should:** terminal search bar · Project Info panel (pm/scripts/frameworks, paste-to-run) · Format Document where Monaco has a formatter · "what changed" stats header · reveal-in-tree / reveal-in-OS cross-links.

**Won't (V1):** AI anything, LSP, terminal tabs/splits/SSH, conflict-resolution UI, hard reset / bare force-push / unmerged-branch delete, MCP execution or health checks, hooks display, auto-update, light theme, Linux claims, telemetry.

## 3. Architecture diagram

```
┌──────────────────────────── Electron main process ────────────────────────────┐
│ window.ts (hardened BrowserWindow)   protocol.ts (app://)   security.ts (nav/  │
│ permissions deny, openExternal allowlist)        fuses @ package time          │
│                                                                                │
│  ipc/register.ts ── zod validate ── sender check ── route to handler           │
│   ├─ handlers/project  ─→ settingsService(recent) · gitService(detect/init)    │
│   ├─ handlers/pty      ─→ ptyService(sessions, batch+watermark flow control)   │
│   ├─ handlers/fs       ─→ pathJail → fileService (+ shell.trashItem)           │
│   ├─ handlers/git      ─→ gitService(simple-git, -c core.hooksPath= always)    │
│   │                        └─ checkpointService (hash in configStore)          │
│   ├─ handlers/claude   ─→ claudeConfigService(.mcp.json/~opt-in) ─ secretMask  │
│   │                        skillsService(SKILL.md/commands parse)              │
│   ├─ handlers/info     ─→ projectInfoService(package.json, lockfiles)          │
│   └─ handlers/settings ─→ settingsService ─ configStore(atomic JSON,userData)  │
│  watcherService(chokidar) ─ batches → events: fs:watch + debounced git:status  │
└───────────────┬───────────────────────────────────────────────────────────────┘
                │ contextBridge: frozen window.dockterm (invoke + typed events)
┌───────────────┴───────────────────────── renderer (sandboxed) ────────────────┐
│ zustand store (project/panels/terminal/editor/git/review/claude/settings)     │
│ TopBar(status chip·branch·dirty·dock buttons) │ CommandPalette(cmdk)          │
│ [Dock panel: Files|Git|Review|MCP|Skills|Info|Settings] │ Terminal(xterm,     │
│  never unmounts) │ EditorPane(Monaco tabs) ── react-resizable-panels          │
│ MiniTerminal(bottom) │ ConfirmDialog(shows exact command) │ Toasts            │
└────────────────────────────────────────────────────────────────────────────────┘
PTY child: user's shell (pwsh/powershell.exe | $SHELL -l) cwd=project root
```

## 4. File/folder structure

```
dockterm/
├─ package.json · electron.vite.config.ts · electron-builder.yml · tsconfig.json
│  tsconfig.node.json · tsconfig.web.json · .gitignore · .editorconfig · LICENSE
├─ .github/workflows/ci.yml          (win+mac: ci → rebuild → typecheck → unit → package)
├─ build/  icon.ico · icon.icns · icon.png
├─ docs/   ARCHITECTURE.md · SECURITY_MODEL.md · PRODUCT_PLAN.md · ROADMAP.md
│          ULTRAPLAN.md · BRAINSTORM.md · decisions/ · research/ · plans/(per-milestone)
├─ .claude/skills/{brainstorming,ultraplan,review-changes,safe-commit}/SKILL.md
├─ src/
│  ├─ shared/      types.ts · ipc.ts · constants.ts · result.ts
│  ├─ main/        index.ts · window.ts · protocol.ts · security.ts
│  │  ├─ ipc/      register.ts · validate.ts · handlers/{project,pty,fs,git,claude,info,settings,app}.ts
│  │  └─ services/ ptyService.ts · shellDetect.ts · pathJail.ts · fileService.ts
│  │               watcherService.ts · gitService.ts · gitInvoke.ts · checkpointService.ts
│  │               configStore.ts · settingsService.ts · claudeConfigService.ts
│  │               skillsService.ts · projectInfoService.ts · secretMask.ts
│  ├─ preload/     index.ts
│  └─ renderer/    index.html · src/main.tsx · src/App.tsx
│     ├─ src/state/      useAppStore.ts (slices) · selectors.ts
│     ├─ src/components/ layout/{TopBar,Shell,StatusChip}.tsx
│     │   terminal/{TerminalView,MiniTerminal,TerminalSearchBar}.tsx · useTerminal.ts · terminalTheme.ts
│     │   files/{FileTree,TreeRow,TreeContextMenu}.tsx
│     │   editor/{EditorPane,EditorTabs}.tsx · monacoSetup.ts · monacoTheme.ts
│     │   git/{GitPanel,ChangeList,CommitModal,BranchMenu,GitOutputLog,BeginnerHint}.tsx
│     │   review/{ReviewPanel,DiffView,BaselinePicker}.tsx
│     │   mcp/{McpPanel,McpServerCard}.tsx · skills/{SkillsPanel,SkillCard}.tsx
│     │   info/ProjectInfoPanel.tsx · settings/SettingsPanel.tsx
│     │   command-palette/CommandPalette.tsx · commands.ts
│     │   common/{ConfirmDialog,Modal,Toast,EmptyState,Tooltip,Kbd}.tsx
│     ├─ src/hooks/  useShortcuts.ts · useIpcEvent.ts
│     └─ src/styles/ tokens.css · base.css · components.css
├─ tests/
│  ├─ unit/        pathJail.test.ts · gitStatusMap.test.ts · gitInvoke.test.ts
│  │               mcpParser.test.ts · skillsParser.test.ts · secretMask.test.ts
│  │               configStore.test.ts · ipcValidators.test.ts · shellDetect.test.ts
│  ├─ integration/ git/{status,commitPush,checkpoint}.test.ts   (real temp repos + local bare remote)
│  ├─ fixtures/    mcp/*.json · skills/** · projects/**
│  └─ e2e/         smoke.spec.ts
├─ README.md · CONTRIBUTING.md · SECURITY.md · CODE_OF_CONDUCT.md
```

One responsibility per file; any file trending past ~300 lines gets split at the next task boundary.

## 5. UI layout plan

Default (terminal only):
```
┌ DockTerm ─ myproj ⎇ main ●3 ─────────────[Files][Git][Rev][MCP][Sk][i][⚙] ┐ 36px
│                                                                            │
│                              T E R M I N A L                               │
│                        (xterm.js — runs `claude`)                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```
Dock + editor open (push, never overlay; react-resizable-panels; sizes persisted):
```
┌ top bar ───────────────────────────────────────────────────────────────────┐
│ FILES (280px) │        TERMINAL (≥38%)        │  EDITOR (Monaco tabs)      │
│  src/         │  $ claude                      │  src/app.ts ● │ index.ts  │
│   app.ts M    │  ▌                             │  1  import …               │
├───────────────┴────────────────────────────────┴────────────────────────────┤
│ MINI TERMINAL (Ctrl+Shift+J · 160px, resizable)                             │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Top bar 36px:** left = project name, branch, dirty count chip; right = status chip (`Clean` / `3 changed` / `Review suggested`) + 7 icon buttons (16px lucide, tooltip with shortcut). No left icon rail (anti-VS-Code-clone, per BRAINSTORM §3).
- **Dock:** single slot, left side, 280px default (min 220 / max 480), one panel at a time; toggling the active panel's button closes it.
- **Editor:** right split; opens on file click; terminal keeps ≥38% width.
- **Theme tokens (tokens.css):** bg `#0d0d0f`, panel `#131318`, raised `#1a1a21`, border `#26262e`, text `#e8e8ed`/`#a0a0ab`/`#6b6b76`, accent presets violet `#7c6bff` (default) / blue `#5b8aff` / teal `#2dd4bf`, success `#4ade80`, warn `#fbbf24`, danger `#f87171` (all muted usage); same palette feeds xterm ITheme + Monaco theme (`terminalTheme.ts`, `monacoTheme.ts`).
- **Type:** UI = system stack; mono = `"JetBrains Mono", "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace`, terminal 13px default.
- Motion ≤150ms ease-out; focus rings on accent; every panel has a designed empty state (copy in component files, drafted in research 07).

**Shortcuts (platform-adaptive; `useShortcuts.ts`; palette shows bindings):**

| Action | macOS | Windows | Notes |
|---|---|---|---|
| Files / Git / Review | `Cmd+B` / `Cmd+G` / `Cmd+R` | `Ctrl+Shift+B` / `G` / `R` | |
| Mini terminal | `Cmd+J` | `Ctrl+Shift+J` | |
| MCP panel | `Cmd+Shift+M` | `Ctrl+Shift+M` | `Cmd+M` = OS minimize |
| Skills panel | — (palette / top-bar button) | — | brief allowed "palette if better" |
| Command palette | `Cmd+Shift+P` *and* `Cmd+K` | `Ctrl+Shift+P` *and* `Ctrl+Shift+K` | K = palette, not Skills |
| Open project | `Cmd+O` | `Ctrl+Shift+O` | |
| Save / Close tab | `Cmd+S` / `Cmd+W` | `Ctrl+S` / `Ctrl+W` | **only when editor focused** |
| Commit (modal open) | `Cmd+Enter` | `Ctrl+Enter` | |
| Terminal copy/paste | `Cmd+C/V` | `Ctrl+Shift+C/V` + right-click paste | xterm defaults preserved |

Rule: plain `Ctrl+<letter>` is never intercepted while the terminal has focus (shell/TUI owns it). Palette opening calls `xterm.blur()` first (cmdk focus-trap fix, research 07).

## 6. Data flow (three load-bearing sequences)

**Terminal stream:** pty.onData → ptyService buffers; flush ≤8ms/32KB → event `pty:data{sessionId,data}` → renderer `xterm.write(data, cb)`; cb → `pty:ack{bytes}`; unacked >128KB → `pty.pause()`, <32KB → `resume()`. Resize: ResizeObserver → FitAddon → `pty:resize`. Exit → `pty:exit` → renderer shows "shell exited — press Enter to restart" → `pty:create`.

**Claude-changed-files arc:** user runs `claude` in terminal → chokidar events → watcherService batches 300ms → event `fs:watch{events[]}` (+ session change-log append) → debounced (500ms) `git status` → event `git:statusChanged{view}` → store updates → tree badges, dirty chip, status chip (`Review suggested` when changes exist since active baseline) → user opens Review → `git:diffSince{base}` list → click file → `git:diffFileSince` → Monaco diff → Stage/Commit → CommitModal → `git:commit` → status refresh → chip `Clean`.

**MCP read:** open MCP panel → `claude:mcpRead{includeUser}` → handler enforces includeUser ⇒ settings.claude.readUserConfig (double gate) → parse project `.mcp.json` (+ user `~/.claude.json` mcpServers if gated-in) → every entry through `secretMask` (env/header values → `[MASKED]`, token-pattern values, credentialed URLs → host-only) → renderer cards with scope labels + trust warning. Nothing is ever spawned.

## 7. IPC API plan (locked interface — `src/shared/ipc.ts`)

Pattern: `IpcInvokeMap` (request/response via `ipcRenderer.invoke`) + `IpcEventMap` (main→renderer). Preload generates `window.dockterm` from the maps; `ipc/register.ts` wires zod schema + sender check + handler per channel; all responses are `Result<T> = {ok:true,value:T} | {ok:false,error:{code:ErrorCode,message:string}}`. Payload caps enforced in validate.ts (e.g. `pty:write` ≤1MB, paths ≤4KB).

| Channel | Req → Res (essentials) |
|---|---|
| `project:openDialog` | `{}` → `{path}∣{canceled:true}` |
| `project:open` | `{path}` → `{path,name,isGitRepo}` |
| `project:getRecent` | `{}` → `{path,name,lastOpenedAt}[]` |
| `project:gitInit` | `{}` → `GitOpResult` (UI-confirmed) |
| `pty:create` | `{kind:'main'∣'mini',cols,rows}` → `{sessionId,shell}` |
| `pty:write` / `pty:resize` / `pty:kill` / `pty:ack` | per §6 |
| `fs:readTree` | `{relPath}` → `TreeNode[]` (lazy, ignore list from constants) |
| `fs:readFile` | `{relPath}` → `{content,mtimeMs}∣{binary:true,size}∣{tooLarge:true,size}` |
| `fs:writeFile` | `{relPath,content,expectedMtimeMs∣null}` → `{mtimeMs}∣{conflict:true}` |
| `fs:create` / `fs:rename` / `fs:delete` | jail-checked; delete → `shell.trashItem` |
| `git:status` | `{}` → `GitStatusView` (see §9) |
| `git:stage` / `git:stageAll` / `git:unstage` / `git:discard` | `{paths[]}` → `GitOpResult` |
| `git:commit` | `{message}` → `{hash,summary}` |
| `git:push` | `{setUpstream?,forceWithLease?}` → `GitOpResult` (credential-wait UX) |
| `git:pull` / `git:branches` / `git:createBranch` / `git:switchBranch` / `git:deleteBranch` | per ADR-004 matrix |
| `git:diffFile` | `{relPath,staged}` → `{original,modified}∣{binary:true}` |
| `git:diffSince` | `{base:'HEAD'∣hash}` → `{files:{relPath,status,insertions,deletions}[]}` |
| `git:diffFileSince` | `{base,relPath}` → `{original,modified}` |
| `checkpoint:create` / `checkpoint:get` | → `{checkpoint}∣{dirty:true}` / `checkpoint∣{stale:true}∣null` |
| `claude:mcpRead` | `{includeUser}` → `{servers:McpServerView[],sources:SourceStatus[]}` |
| `claude:mcpCreateTemplate` | `{}` → `{relPath}` (fails if exists) |
| `claude:skillsRead` | `{includeUser}` → `{skills:SkillView[],commands:CommandView[],sources}` |
| `claude:skillCreate` | `{name,kind:'skill'∣'command',template}` → `{relPath}` |
| `info:get` | `{}` → `{packageManager,scripts[],frameworks[],remote,root}` |
| `settings:get` / `settings:set` | `Partial<Settings>` → `Settings` |
| `app:openExternal` | `{url}` (http/https allowlist) · `app:revealInOs` `{relPath}` |

**Events:** `pty:data{sessionId,data}` · `pty:exit{sessionId,exitCode}` · `fs:watch{events[]}` · `git:statusChanged{view}` · `settings:changed{settings}`.

## 8. PTY service plan

`ptyService.ts`: `create({kind,cols,rows,cwd}) → Session` (max 2 sessions: main+mini), `write`, `resize` (clamps cols/rows 2..500), `kill` (tree-kill semantics on Windows), `ack`; per-session output buffer with 8ms/32KB flush + 128KB/32KB watermark pause/resume; on window close → kill all. `shellDetect.ts`: win → `pwsh.exe` on PATH else `powershell.exe` (COMSPEC fallback); mac → `$SHELL` with `-l`. Env: inherit + `TERM=xterm-256color`, `COLORTERM=truecolor`, `CLAUDE_CODE_NO_FLICKER=1`. After spawn, write-through `\x1b[>4;1m` (modifyOtherKeys → Shift+Enter works in Claude Code). Renderer `useTerminal.ts`: xterm 5.5 + fit/search/web-links/unicode11 (+webgl unless settings `renderer:'dom'`; auto-fallback on context loss); component mounted for app lifetime. Restart UX on exit. **Tests:** shellDetect unit; flow-control buffer unit (pure logic, fake pty); manual M1 gate vs real `claude`.

## 9. Git service plan

`gitInvoke.ts` — the only way git runs: simple-git instance created per call batch with `['-c','core.hooksPath=']` baseConfig, project-root cwd, `timeout:{block:60_000}`, paths after `--`; maps errors → `ErrorCode` (`NO_UPSTREAM`, `AUTH_WAIT`, `MERGE_CONFLICT`, `NOT_REPO`, `EMPTY_REPO`, `DETACHED`, `NETWORK`, `UNKNOWN`) + raw output captured for GitOutputLog. `gitService.ts` API: `status() → GitStatusView {branch,upstream:{remote,ahead,behind}|null,staged[],unstaged[],untracked[],conflicted[],repoState:'ok'|'empty'|'detached'|'conflicted'}` · `stage/unstage/discard(paths)` (discard = `git restore --` / clean -fd never) · `commit(message)` (non-empty subject validated) · `push({setUpstream,forceWithLease})` · `pull()` · `branches()/createBranch/switchBranch/deleteBranch(mergedOnly)` · `diffFile/diffSince/diffFileSince` (original content via `git show <base>:<path>`, staged base `:0:<path>`; untracked → empty original; binary detect) · `isClean()`. `checkpointService.ts`: `create(label?)` → clean? store `{hash,branch,label,createdAt}` per project in configStore : `{dirty:true}`; `get()` validates `git cat-file -e` else `{stale:true}`. Beginner microcopy + danger confirmations live in renderer, keyed by ErrorCode/action (copy from research 05/07). **Tests:** status→view mapping fixtures; integration on temp repos incl. local bare remote (publish-branch flow), zero-commit repo, conflict detection; assertion that *every* invocation includes `core.hooksPath=`.

## 10. File service plan

`pathJail.ts` (pure, fully unit-tested): `resolveInside(root, relPath)` → realpath(root) + resolve + realpath-of-nearest-existing-ancestor; prefix compare (case-insensitive on win32, separator-safe); rejects UNC (unless root is UNC), drive changes, `..` escapes, symlink escapes → typed `JAIL_VIOLATION`. `fileService.ts`: readTree (lazy one level, ignore list `node_modules,.git,dist,build,.next,.turbo,coverage,.DS_Store`), readFile (1.5MB cap + NUL sniff → binary), writeFile (mtime conflict check, atomic tmp+rename), create/rename/delete (delete → `shell.trashItem`, recursive confirm in UI). `watcherService.ts`: chokidar on project root, same ignores, `followSymlinks:false`, `ignoreInitial:true`, 300ms batch → `fs:watch` + session change-log (capped ring 500) + 500ms-debounced git status refresh. `configStore.ts`: atomic JSON in `userData/dockterm-config.json`, corrupt-file → `.bak` + defaults, schemaVersion migration hook.

## 11. MCP service plan

`claudeConfigService.ts`: `readMcp({includeUser})` → parse project `.mcp.json`; if includeUser && settings gate → parse `~/.claude.json` top-level `mcpServers` only (stream-read, pick key, never log); each entry → `McpServerView {name, transport:'stdio'|'http'|'sse'|'unknown', commandDisplay|urlDisplay (host-only if credentialed), maskedEnvKeys[], maskedHeaderKeys[], scope:'project'|'user', sourcePath, status:'configured'|'parse-error'}`; tolerant of unknown keys; malformed → per-source error state. `secretMask.ts` (pure, tested): masks all env/header **values**, any value matching `/token|secret|key|api.?key|authorization|bearer|password/i` on key or 32+-char-opaque heuristic on value, credentialed URLs → host. Template creation writes ADR-005's minimal `.mcp.json` (jailed, fails-if-exists). Panel: educational line + trust warning verbatim from brief; Refresh / Open .mcp.json (in editor) / Create template / Copy `claude mcp add …` snippet. Never executes anything (ADR-005).

## 12. Skills service plan

`skillsService.ts`: enumerate `.claude/skills/*/SKILL.md` + `.claude/commands/**/*.md` (project; user equivalents behind same opt-in gate) → parse frontmatter (name, description, disable-model-invocation, allowed-tools; tolerate unknown) + first body paragraph fallback for description → `SkillView {slashName, description, scope, sourceRelPath, kind:'skill'|'command'}`; namespaced command subdirs honored. Actions: open in editor · refresh · create from template (`brainstorming`, `ultraplan`, `review-changes`, `safe-commit`, `blank`) → writes into project `.claude/` (jailed). The four DockTerm repo skills ship in this repository itself (M12) and double as the templates.

## 13. Settings storage plan

`Settings` (shared/types.ts): `{schemaVersion:1, lastProjectPath, recentProjects[≤8], terminal:{fontFamily|null,fontSize:13,cursorStyle:'block',cursorBlink:true,renderer:'auto'|'dom',scrollback:5000}, editor:{fontSize:13}, ui:{accent:'violet'|'blue'|'teal', dockWidth, editorRatio, miniTermHeight, openPanel|null, miniTermOpen}, git:{beginnerMode:true, confirmDanger:true}, claude:{readUserConfig:false}, checkpoints:Record<projectKey,Checkpoint>}`. Via configStore (atomic, validated with zod on load; invalid → defaults + `.bak`). `settings:set` merges partials, emits `settings:changed`; live-applies to xterm/Monaco/CSS vars. Force-push and discard confirmations cannot be disabled even when `confirmDanger:false`.

## 14. Testing plan

- **Unit (Vitest 4, node env, `vi.mock('electron')` setup):** pathJail (traversal/symlink/case/UNC) · gitStatusMap fixtures · gitInvoke hardening (hooksPath always present; `--` separators) · mcpParser + skillsParser fixture suites (valid/malformed/huge/secret-laden→masked) · secretMask · configStore (atomic/corrupt/migration) · ipcValidators (reject oversized/malformed) · shellDetect · flow-control buffer.
- **Integration:** real git temp repos (init→commit→branch→bare-remote push/pull→checkpoint diff) with `--pool=forks` + retry rimraf (Windows EBUSY).
- **E2E (Playwright `_electron`):** smoke only — launch, window title, terminal prints `echo hello`, open fixture project, toggle each panel, quit. On-demand, not per-PR.
- **Manual QA checklist** (`docs/research/09` §checklist, ~40 items) executed on Windows before tag; macOS pass via CI artifacts + a borrowed Mac before v1.0 claims.
- **Gates per merge:** `npm run typecheck` + `npm run test:unit`. **Release gates:** + integration, build, package, manual checklist, no-fake-UI audit (every rendered control wired or absent — grep + click-through).

## 15. Security checklist (release-blocking; from ADR-006)

- [ ] sandbox:true · contextIsolation:true · nodeIntegration:false (asserted in e2e)
- [ ] `app://` prod protocol; CSP no remote origins; `worker-src blob:`; eval scoped or absent
- [ ] will-navigate blocked · windowOpen denied · permissions denied · openExternal allowlist
- [ ] fuses set at package: runAsNode/nodeOptions/inspect OFF, asar integrity ON
- [ ] every IPC channel: zod schema + size cap + senderFrame check (unit-tested registry)
- [ ] pathJail on every fs/watcher/git path; jail test suite green
- [ ] every git invocation carries `-c core.hooksPath=` (tested) · force = with-lease only
- [ ] no `shell:true`, no string-built commands (grep gate) · run-scripts paste-don't-exec
- [ ] secretMask on all MCP/skills display paths; no secrets in logs or config (grep gate)
- [ ] user-scope Claude reads double-gated (setting + call flag), default off
- [ ] zero network calls at runtime except user-initiated git + openExternal (devtools audit)
- [ ] destructive actions list each show ConfirmDialog with exact command

## 16. Implementation milestones (with acceptance criteria)

Repo is `git init`-ed at M0 with conventional commits per task (deviation from brief's step-21 placement — enables frequent commits and dogfooding checkpoints; public repo creation still last). Each milestone starts by generating `docs/plans/M<N>-*.md` at full writing-plans granularity from this document's interfaces.

| M | Scope (brief steps) | Acceptance gate |
|---|---|---|
| **M0** | Scaffold electron-vite+React+TS strict; hardened window/protocol/security; tokens.css; CI skeleton; git init (1–3) | `npm run dev` opens hardened empty app; typecheck+build pass; CSP verified incl. Monaco spike |
| **M1** | **Terminal core hard gate** (5): ptyService+shellDetect+flow control+TerminalView+fit/search/paste+kitty mode | `claude` TUI fully usable on this Windows machine: resize storm, 5MB output flood, Shift+Enter, paste multiline, unicode — all pass |
| **M2** | Project open/reopen, empty state, git detect/init, configStore+settings, pathJail, watcher (4) | reopen-last works; jail suite green; watcher events visible in dev log |
| **M3** | Mini terminal (6) | toggle/resize/persist; independent shell; paste-to-run plumbing ready |
| **M4** | File tree + Monaco editor (7–8) | CRUD w/ trash+confirm; tabs/dirty/save; mtime conflict dialog; binary/huge blocked |
| **M5** | Git service+panel (9) | all ADR-004 flows on a real repo incl. no-upstream publish + credential-wait UX; badges+chips live |
| **M6** | Review + checkpoints (10–11) | three baselines work; Monaco diff; stage/commit from review; stale-checkpoint message |
| **M7** | MCP panel (12) | real `.mcp.json` + opt-in user scope parsed; masking test green; template creation |
| **M8** | Skills panel (13) | skills+commands listed w/ frontmatter; create-from-template works |
| **M9** | Palette + shortcuts + project info (14) | every command in palette; platform keymap; paste-to-run scripts |
| **M10** | Settings panel + UI polish (15,17) | settings live-apply+persist; empty/loading/error states everywhere; layout reset |
| **M11** | Tests+QA hardening (18–20) | unit+integration green on win; typecheck+build+NSIS package; manual checklist executed; security checklist §15 all checked |
| **M12** | Docs+repo+publish (16,21–23) | README(+GIF placeholder)/LICENSE/CONTRIBUTING/SECURITY/CoC/docs4 + .claude skills; public repo `dockterm` pushed (gh absent → print exact commands) |

## 17. Exact order of files to create

**M0:** package.json → tsconfigs → electron.vite.config.ts → .gitignore/.editorconfig → src/shared/{constants,result,types,ipc}.ts → src/main/{index,window,protocol,security}.ts → src/preload/index.ts → renderer index.html/main.tsx/App.tsx → styles/tokens.css,base.css → electron-builder.yml → .github/workflows/ci.yml.
**M1:** services/shellDetect.ts → tests/unit/shellDetect.test.ts → services/ptyService.ts (+flow buffer test) → ipc/validate.ts → ipc/handlers/pty.ts → ipc/register.ts → renderer terminal/{terminalTheme.ts,useTerminal.ts,TerminalView.tsx,TerminalSearchBar.tsx}.
**M2:** services/pathJail.ts → tests/unit/pathJail.test.ts → services/configStore.ts (+test) → settingsService.ts → handlers/{settings,project}.ts → services/watcherService.ts → renderer layout/{TopBar,Shell,StatusChip}.tsx, EmptyState, store slices.
**M3:** MiniTerminal.tsx + pty kind wiring.
**M4:** services/fileService.ts → handlers/fs.ts → files/{FileTree,TreeRow,TreeContextMenu}.tsx → editor/{monacoSetup.ts,monacoTheme.ts,EditorTabs.tsx,EditorPane.tsx} → common/{Modal,ConfirmDialog,Toast,Tooltip,Kbd}.tsx.
**M5:** services/gitInvoke.ts (+test) → gitService.ts → tests/unit/gitStatusMap.test.ts → tests/integration/git/*.ts → handlers/git.ts → git/{GitPanel,ChangeList,CommitModal,BranchMenu,GitOutputLog,BeginnerHint}.tsx.
**M6:** services/checkpointService.ts (+integration test) → review/{BaselinePicker,DiffView,ReviewPanel}.tsx.
**M7:** services/secretMask.ts (+test) → claudeConfigService.ts (+fixtures/tests) → handlers/claude.ts → mcp/{McpPanel,McpServerCard}.tsx.
**M8:** services/skillsService.ts (+fixtures/tests) → skills/{SkillsPanel,SkillCard}.tsx + templates.
**M9:** command-palette/{commands.ts,CommandPalette.tsx} → hooks/useShortcuts.ts → services/projectInfoService.ts (+test) → handlers/{info,app}.ts → info/ProjectInfoPanel.tsx.
**M10:** settings/SettingsPanel.tsx → styles/components.css polish pass.
**M11:** tests/e2e/smoke.spec.ts → remaining test fill → fix cycles.
**M12:** README.md → LICENSE → CONTRIBUTING.md → SECURITY.md → CODE_OF_CONDUCT.md → docs/{ARCHITECTURE,SECURITY_MODEL,PRODUCT_PLAN,ROADMAP}.md → .claude/skills/4× → publish.

## 18. Risk list & fallback strategies

| # | Risk | Likelihood/Impact | Fallback |
|---|---|---|---|
| 1 | node-pty fails to build/rebuild on Windows (Spectre libs, ABI) | M / blocks M1 | Pin alternate node-pty version → `@homebridge/node-pty-prebuilt-multiarch` → document VS component install; M1 is scheduled first to surface this immediately |
| 2 | WebGL renderer garbles Claude Code TUI | M / M | Auto-fallback + `renderer:'dom'` setting (ships V1); `rescaleOverlappingGlyphs:true` |
| 3 | Monaco needs `unsafe-eval` under strict CSP | M / L | Scope eval to packaged `app://` origin only; verified at M0 spike; documented in SECURITY_MODEL |
| 4 | Claude Code config format drift (mcp/skills) | M / M | Defensive tolerant parsers + fixture suite + "unknown" states; parse-only design degrades gracefully |
| 5 | Credential helper dialog blocks push/pull | H / M | 60s block-timeout, "waiting for sign-in" UX with cancel, docs (designed-in from M5, per research 05) |
| 6 | Playwright `_electron` flake | M / L | E2E is smoke-only + on-demand; manual checklist is the real gate |
| 7 | Windows-only dev breaks macOS | M / H | CI mac matrix from M0; path/jail/shell code platform-tested; pre-tag manual mac pass required before claiming macOS support |
| 8 | Large repos: watcher/status storms | M / M | Ignore list + 300/500ms debounces + lazy tree from day one; cap session log |
| 9 | Checkpoint hash GC'd/rebased away | L / L | `cat-file -e` guard → friendly "checkpoint no longer exists" + offer new checkpoint |
| 10 | Anthropic desktop app ships our wedge first | M / H | Ship fast (M1 gate early), lead with parse-only MCP/skills + git safety + privacy identity (research 01/02) |
| 11 | Scope creep past V1 fence | M / H | §1 anti-bloat rules + §2 Won't list are merge criteria |

## 19. Acceptance criteria (V1 done =)

User's quality bar, verbatim, all on the Windows dev machine: `npm install` works · `npm run dev` works · `npm run typecheck` passes · `npm run build` passes · zero TS errors · app opens · terminal runs Claude Code properly · file editing works · Git panel works on real repos · MCP/Skills panels really parse local config (masked) · project open/reopen works · no fake buttons (audit §14) · security checklist §15 fully checked · docs complete · public repo `dockterm` exists with polished README. Explicit non-claims preserved (ADR-007): not an iTerm/Cursor replacement, not enterprise-security, no MCP marketplace, macOS builds unsigned.

---
*Self-review done: brief features 1–13 each map to milestones (1→M2, 2→M1, 3→M3, 4→M4, 5→M4, 6→M5, 7→M6, 8→M2/M6, 9→M7, 10→M8, 11→M9, 12→M9, 13→M10); no TBDs; service/type names consistent across §§7–13 and §17.*
