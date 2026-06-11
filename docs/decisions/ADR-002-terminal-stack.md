# ADR-002: Terminal stack — @xterm/xterm 5.5.x + node-pty, PTY in main process

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/03-terminal-engineering.md

## Context

The terminal must run Claude Code's TUI flawlessly on Windows + macOS: heavy ANSI streaming,
resize, paste, unicode/CJK/emoji, Shift+Enter, search. xterm.js 6.0 removed the canvas addon;
Claude Code's docs note GPU-acceleration quirks in xterm-based terminals. node-pty stable
1.1.0 lacks Windows fixes that the 1.2.0-beta line (shipped inside VS Code) has.

## Decision

1. **@xterm/xterm 5.5.x** + addons: fit, search, web-links, unicode11, serialize, **webgl**
   (primary renderer) with automatic fallback to the DOM renderer on context loss or when a
   `terminal.gpu=off` setting is set. Do not adopt 6.0 in V1.
2. **node-pty pinned to the current 1.2.0-beta.x** (exact version in lockfile), rebuilt for
   Electron via @electron/rebuild; `asarUnpack` the entire node-pty package.
3. **PTY service lives in the Electron main process** for V1. Renderer↔main streaming uses
   batched IPC (coalesce writes every ~8–16 ms) plus watermark flow control
   (pause PTY at ~100KB unacknowledged, resume at ~10KB) driven by xterm.js write callbacks.
4. **Shell selection:** macOS → `$SHELL` spawned as a login shell (`-l`); Windows → `pwsh.exe`
   if present, else `powershell.exe` (COMSPEC as last resort). Env: `TERM=xterm-256color`,
   `COLORTERM=truecolor`, `LANG` passthrough.
5. **Claude Code TUI enablers:** after shell init, enable kitty/modifyOtherKeys mode
   (`\x1b[>4;1m` write-through) so Shift+Enter is distinguishable; set
   `CLAUDE_CODE_NO_FLICKER=1` in the spawned environment; verify WebGL rendering against the
   real Claude Code TUI in the first milestone, with `rescaleOverlappingGlyphs: true`.
6. The terminal React component **never unmounts** while a project is open; panels resize it
   (FitAddon + ResizeObserver → pty.resize).

## Rationale for main-process PTY (vs utilityProcess)

VS Code's ptyHost (utilityProcess) exists for multi-window sharing and reload reconnection —
DockTerm V1 is single-window. Batched IPC comfortably exceeds Claude Code's output rates, and
main stays light (git/fs are async). utilityProcess + MessagePort is the documented V1.x
upgrade path if terminal latency is ever measured degrading under load. This intentionally
trades the research agent's "ideal" for V1 simplicity, with a measured trigger to revisit.

## Consequences

- Windows contributors need VS 2022 C++ toolset (+ possibly Spectre-mitigated libs) — document
  in CONTRIBUTING; CI verifies the build matrix.
- A "terminal renderer" setting (auto/dom) ships in V1 as the WebGL escape hatch.
- Milestone M1 is a hard gate: Claude Code must render correctly on the Windows dev machine
  before any panel work proceeds.

## Alternatives rejected

- **xterm.js 6.0:** no canvas fallback; unproven against Claude Code TUI; revisit post-V1.
- **utilityProcess PTY host in V1:** extra build entry + port plumbing without a V1 problem.
- **child_process pipes / ssh2 / websocket bridges:** not a TTY / wrong tool.
- **node-pty 1.1.0 stable:** known Windows use-after-free and freeze bugs fixed in the beta line.
