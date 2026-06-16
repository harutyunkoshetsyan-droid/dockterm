# DockTerm — Live directory tracking (dock follows the focused terminal)

**Status:** approved direction, 2026-06-16. Builds on v0.5.3.

## Goal
The Files panel, Git panel, and dock header should follow the **directory the focused
terminal is actually in** — including after a manual `cd` — not just the folder the pane
was spawned in. Focusing the `GlowAI-main` pane shows GlowAI-main's files; focusing a pane
that has `cd roast-me` shows roast-me's files. Identity unchanged: local-only, no telemetry.

## Why this is non-trivial
DockTerm only knows each pane's **spawn** directory (`leaf.cwd`). A shell `cd` happens
entirely inside the child process; the app never sees it. To follow it, the shell must
**report** its directory. The cross-terminal standard is the `OSC 7` escape sequence
(`ESC ] 7 ; file://<host><path> BEL`), emitted by the shell on each prompt and captured by
the terminal (VS Code, iTerm2, WezTerm, Windows Terminal all do this).

## Approach (chosen: automatic shell integration)
On spawn, DockTerm transparently injects a small hook so the shell emits `OSC 7`. xterm
captures it; the dock follows. When integration can't apply, the dock falls back to the
pane's spawn folder — no regression.

## Components

### 1. Shell integration injection — `src/main/services/shellIntegration.ts` (new)
Given the resolved shell (from existing `shellDetect.ts`) returns the spawn `args` and `env`
overrides that make the shell emit `OSC 7`. Integration scripts live under
`app.getPath('userData')/shell-integration/` (written once on first use).

- **zsh:** set `env.ZDOTDIR = <integration dir>` and `env.DOCKTERM_USER_ZDOTDIR = <original ZDOTDIR or $HOME>`.
  The integration `.zshrc` re-sources the user's startup files from `DOCKTERM_USER_ZDOTDIR`
  (`.zshrc`, and `.zshenv`/`.zprofile`/`.zlogin` via the matching files), then adds:
  ```zsh
  _dockterm_osc7() { printf '\e]7;file://%s%s\a' "${HOST}" "${PWD}" }
  typeset -ag precmd_functions; precmd_functions+=(_dockterm_osc7)
  ```
- **bash:** spawn arg `--init-file <integration .bash>`; the file sources `~/.bashrc`
  (if present) then appends an `OSC 7` emitter to `PROMPT_COMMAND`.
- **pwsh / PowerShell:** spawn args `-NoExit -Command ". '<integration .ps1>'"`; the script
  dot-sources the user `$PROFILE` (if any) then redefines `prompt` to call the previous
  prompt and emit `OSC 7`.
- **Unknown shell / integration disabled / explicit user shell override we can't classify:**
  return no overrides → spawn unchanged.

`buildIntegration(shellPath, baseEnv): { args: string[]; env: Record<string,string> }` is the
single entry point. Pure except for the one-time idempotent file write (separately tested
by asserting the returned args/env, not the FS).

### 2. PTY spawn wiring — `src/main/services/ptyService.ts`
When `settings.terminal.shellIntegration` is on, merge `buildIntegration(...)` args/env into
the spawn. Integration args are prepended to the shell's own args; env is merged over the
inherited env. Off → spawn exactly as today.

### 3. OSC 7 capture — `src/renderer/src/components/terminal/useTerminal.ts`
After `term.open`, register `term.parser.registerOscHandler(7, (data) => { … ; return true })`.
Parse with a pure helper `parseOsc7(payload): string | null`:
- Accept `file://<host>/<path>`; ignore other hosts only when they are clearly remote — but
  since SSH sessions emit the remote host we simply take the path component (the path is what
  the user sees). Percent-decode the path.
- Windows: a payload path like `/C:/Users/x` → `C:\Users\x` (strip leading slash, swap
  separators). POSIX: use as-is.
- Return `null` for unparseable payloads (handler still returns `true`).
`useTerminal` gains an `onCwd?: (cwd: string) => void` option, called with the parsed path.

### 4. Live cwd state — `src/renderer/src/state/useWorkspaceStore.ts`
Add `paneCwd: Record<string, string>` (leafId → live cwd) and
`setPaneCwd(leafId, cwd)`. **Not** persisted, **not** part of `leaf.cwd`.
- `leaf.cwd` continues to key `TerminalView` (`leaf.id + ':' + leaf.cwd`); the live map never
  changes it, so the shell is never respawned by a `cd`.
- `closeFocused` / `close` / `retargetLeaf` prune stale `paneCwd` entries.
- New selector helper `effectiveCwd(tab)`: `paneCwd[focusedLeafId] ?? findLeaf(...).cwd`.

### 5. Dock follows — `src/renderer/src/components/layout/Shell.tsx`
The focus effect keys on `effectiveCwd` (focused leaf id **and** its live cwd). On change:
`project:setActiveRoot` → store `activeRoot` → refresh Git → **refresh the file tree**.

### 6. File tree follows — `src/renderer/src/components/files/FileTree.tsx`
Subscribe to `useAppStore.activeRoot`; when it changes, reset `expanded`/`children` and
reload the root. Header shows the active project's name (basename of `activeRoot`) rather
than only the window's project.

### 7. Setting — `terminal.shellIntegration: boolean` (default `true`)
Added to `settingsService` schema + `shared/types` + a toggle in Settings → Terminal
("Track directory (shell integration)"). Off = no injection, dock uses spawn folders.

## Wiring `onCwd`
`PaneTree`'s `TerminalView` passes `onCwd={(cwd) => useWorkspaceStore.getState().setPaneCwd(leaf.id, cwd)}`.

## Security
- Integration scripts are local files in `userData`; they only source the user's own startup
  files and add a printf — no network, no secrets. CSP unchanged.
- `OSC 7` only updates the in-app cwd pointer. All filesystem reads stay path-jailed within
  the resolved project root, exactly as today.
- A malicious program could emit a fake `OSC 7`; worst case the dock points at another local
  folder the user can already read. No escalation. (Same threat model as every OSC-7 terminal.)

## Testing
- Unit: `parseOsc7` (POSIX path, percent-decoded path, `file://host/path`, Windows
  `/C:/…` → `C:\…`, garbage → null). `buildIntegration` returns expected args/env per shell
  and nothing for unknown shells / when disabled. `effectiveCwd` falls back correctly and
  prunes on close.
- Manual: zsh `cd` updates Files + Git live; 2×3 grid with panes in different dirs, focusing
  each switches the dock; integration off → spawn-folder behavior; SSH session → no crash,
  dock stays on spawn folder.

## Non-goals
- Tracking cwd inside SSH/containers (shows the local pane folder there).
- `cmd.exe` integration (PowerShell is supported).
- Changing how panes are created or how `leaf.cwd` works.
- Icon sizing/positioning — separate effort.

## Build order
1. `parseOsc7` + OSC 7 capture in `useTerminal` (+ `onCwd`) — unit-tested, no behavior change yet.
2. `paneCwd` state + `effectiveCwd` + `PaneTree` wiring — dock not yet reading it.
3. File-tree-follows-activeRoot + dock header (fixes the existing gap; immediately useful).
4. Shell focus effect uses `effectiveCwd`.
5. `shellIntegration` service + ptyService wiring + setting + toggle.
