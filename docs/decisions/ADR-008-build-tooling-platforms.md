# ADR-008: electron-vite + electron-builder, npm, Windows-first dev / dual-platform target

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/03, 04, 09 + Phase 0 environment check

## Context

The brief's wording is macOS-centric (Cmd shortcuts, macOS packaging) but the development
machine is **Windows 11** (Node 24, npm 11, VS 2022, no pnpm, no gh, PowerShell 5.1 only).
The app must demonstrably run where it's built first.

## Decision

### Tooling
- **Scaffold/build: electron-vite v5** — first-class main/preload/renderer Vite builds, HMR,
  native-dep externalization (node-pty). Electron Forge's Vite plugin remains experimental.
- **Package: electron-builder 26.x** — NSIS installer (win), DMG/ZIP (mac), `asarUnpack`
  for node-pty, fuses applied at package time.
- **Package manager: npm** (lockfile committed). No pnpm/yarn in V1 (hoisting friction with
  native rebuilds; npm is what's installed).
- **State: zustand. Validation: zod. Icons: lucide-react. Panels: react-resizable-panels.
  Palette: cmdk. Watcher: chokidar (followSymlinks:false).**
- **Native rebuild:** `@electron/rebuild` wired into postinstall (`electron-builder
  install-app-deps`); CONTRIBUTING documents VS 2022 C++ workload (+ Spectre libs if the
  build demands them — verified at M0/M1).
- **TypeScript strict**, `npm run typecheck` (tsc --noEmit across all three targets) and
  `npm run build` as release gates; ESLint kept minimal.

### Platform strategy
- **Both Windows and macOS are first-class targets; Windows is the daily dev/test platform**
  (it's where the machine is). macOS correctness is enforced by design rules (no hardcoded
  paths, `path` module everywhere, login-shell spawn) and CI (`windows-latest` +
  `macos-latest` matrix: install → rebuild → typecheck → unit → package unsigned).
- **Keyboard scheme is platform-adaptive** (UI shows the right glyphs): macOS `Cmd+letter`,
  Windows `Ctrl+Shift+letter`; plain `Ctrl+letter` is never intercepted (shell owns it);
  `Ctrl/Cmd+S`/`W` active only when the editor has focus. `Cmd+M` is reserved by macOS →
  MCP panel uses `Cmd+Shift+M` / `Ctrl+Shift+M`.
- **V1 distribution honesty:** Windows NSIS installer built locally; macOS builds unsigned
  via CI (signing/notarization needs Apple credentials + macOS — documented as a known
  limitation in README/ROADMAP).
- Linux: untested in V1; not claimed.

## Consequences

- The user's spec shortcuts (`Cmd+B` etc.) exist verbatim on macOS; Windows users get the
  `Ctrl+Shift` mirror — documented in README and the command palette shows bindings.
- CI is the macOS safety net until a Mac is in the loop; manual macOS QA pass required
  before tagging v1.0 (tracked in ROADMAP).

## Alternatives rejected

- Electron Forge (+ vite plugin experimental); pnpm (not installed; native-dep friction);
- macOS-only V1 (cannot be built or tested on the available hardware);
- Same shortcuts on both platforms (steals the shell's Ctrl keys on Windows — breaks
  readline/tmux/Claude Code TUI).
