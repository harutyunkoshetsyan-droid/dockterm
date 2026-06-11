# ADR-001: Electron over Tauri for V1

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/04-desktop-architecture.md

## Context

DockTerm needs: a real PTY (spawn the user's shell, stream ANSI at multi-MB/s), xterm.js,
Monaco, filesystem + git + chokidar services, on Windows 11 and macOS, built fast by a
TypeScript-first effort. Tauri v2 offers smaller binaries and lower memory; Electron offers
the Node ecosystem in-process.

## Decision

**Electron 42** (Node 24.x, Chromium 148 class). Pin the exact version in package.json.

## Rationale

1. **PTY is the hero feature.** node-pty is mature on ConPTY/forkpty and is what VS Code ships.
   Tauri would require a Rust PTY layer (`portable-pty` / `tauri-plugin-pty`, immature as of
   2025) plus a custom bridge to xterm.js — the riskiest part of the app rewritten in the
   stack we know least.
2. **Service layer (fs/git/watcher/config parsing) is all Node** — simple-git, chokidar drop in.
3. **Monaco under WKWebView (macOS Tauri) has documented rendering issues**; Chromium does not.
4. **Velocity:** one language end-to-end. Tauri estimated +4–8 weeks for V1 parity.
5. Binary size/memory are real Electron costs — accepted consciously for a developer tool.

## Consequences

- ~100MB+ installers; mitigate nothing in V1 (honesty over heroics).
- Security burden shifts to us: strict main/preload/renderer separation (ADR-006).
- Native module (node-pty) must be rebuilt for Electron's ABI (ADR-008).

## Alternatives rejected

- **Tauri v2:** PTY/Rust risk + Monaco/WKWebView bugs + ramp-up cost (above).
- **Web app + local Node server:** loses native menus/dialogs/single-binary feel; websocket
  PTY bridge adds latency and a port to secure; not actually simpler.
