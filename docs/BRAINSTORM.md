# DockTerm — Brainstorm (Phase 2)

> Date: 2026-06-11 · Status: complete · Inputs: product brief + `docs/research/01–10`
> Method: superpowers brainstorming process run in synthesis mode — the brief pre-answered
> the clarifying questions; this doc records intent, explored approaches, and the final V1 scope.
> Nothing here is implementation; the approval gate is the /ultraplan (Phase 5).

## 1. The product in one breath

**DockTerm is the terminal workspace Claude Code always assumed you had.** You run `claude`
in a real terminal that stays the hero; when Claude changes things, DockTerm's dock shows you
what changed, lets you review the diff, and lets you commit safely — without alt-tabbing to an
IDE. No accounts, no cloud, no telemetry — *not opt-out, just absent.*

The pain (validated in research 01/02): while Claude works, your state is scattered across a
terminal, an editor you opened "just to look," a Git client, and a browser. DockTerm collapses
that into one calm window without becoming an IDE.

## 2. What the brief pre-decided (not re-litigated)

- Terminal-first; panels on demand; dark, minimal, professional; lucide icons; custom CSS.
- Stack: Electron + React + TS + Vite, xterm.js, node-pty, Monaco, simple-git, chokidar, zustand.
- V1 features: project open/reopen, main + mini terminal, file tree, Monaco editor, Git panel
  (beginner mode, safety confirmations), diff/review + checkpoints, MCP panel, Skills panel,
  command palette, project info, settings.
- Hard NOs: AI chat, AI API calls, telemetry, accounts, cloud sync, stored tokens, fake UI.
- Public GitHub repo `dockterm`, MIT, full docs set.

## 3. Approaches explored (the real forks)

| Fork | Options considered | Pick | Why (details in ADRs) |
|---|---|---|---|
| Runtime | Electron · Tauri v2 · web app + local server | **Electron 42** | node-pty needs Node; Tauri = Rust PTY bridge + 4–8 wks ramp; Monaco/WKWebView bugs (ADR-001) |
| Scaffold | electron-vite · Forge+vite plugin · manual | **electron-vite v5 + electron-builder** | Forge's Vite plugin still experimental; electron-vite handles main/preload/renderer + native externals (ADR-008) |
| PTY placement | main process · utilityProcess (VS Code style) · renderer | **Main process** for V1 | Single window, light main; batching + watermark flow control suffices; utilityProcess is the documented V1.x upgrade if contention appears (ADR-002) |
| Terminal lib | @xterm/xterm 5.5.x · 6.0 | **5.5.x** | 6.0 drops canvas fallback; Claude Code TUI has known GPU-accel quirks → WebGL with DOM fallback (ADR-002) |
| Editor | Monaco · CodeMirror 6 | **Monaco** | Built-in diff editor is the review panel; CM6 lighter but diff UX is custom work (ADR-003) |
| Git layer | simple-git · raw `git` + porcelain-v2 parser | **simple-git 3.36+** (+ `raw()` escape hatch) | Typed errors, maintained, CVE-patched; every call hardened with `-c core.hooksPath=` (ADR-004, ADR-006) |
| MCP visibility | parse config files only · run `claude mcp list` · connect as MCP client | **Parse-only** | CLI may spawn server processes; connecting executes code. Read + mask + never execute (ADR-005) |
| Dock anatomy | VS Code-style left icon rail · top-bar buttons + single-slot dock panel | **Top-bar buttons + single-slot left panel** | Brief demands "minimal top bar, small dock buttons" and "not a VS Code clone"; a rail reads as VS Code |
| Panel behavior | overlay · push/split | **Push** via react-resizable-panels; terminal component never unmounts | Predictable, resizable, terminal stays alive |
| Run scripts | invisible execFile · paste into mini terminal | **Paste into mini terminal** | Visibility is a security feature; teaches the CLI (research 08) |
| Config store | electron-store · hand-rolled atomic JSON | **Hand-rolled (~40 lines)** | electron-store v11 ESM friction; we need atomic write + corrupt-file recovery only |

## 4. Top 10 ideas (ranked)

1. **The Review Arc** — files light up as Claude edits → click → Monaco diff → stage → commit, never leaving the window. This is the 15-second GIF that sells the app.
2. **Checkpoints** — pin the current commit as "known good"; Review can always answer "what changed since I last trusted this repo?" (Just a git hash in app config — no magic.)
3. **Top-bar agent status** — Clean / N files changed / Review suggested, driven purely by watcher + git. Feels like Claude-awareness with zero AI calls.
4. **MCP X-ray** — the first tool that shows your Claude Code MCP config honestly: scope-labeled, secrets always masked, trust warning included, nothing ever executed.
5. **Skills browser + templates** — see project/user skills & commands; create a project skill from a template in one click. DockTerm ships its own repo skills (dogfooding).
6. **Visible script running** — Project Info "run" buttons paste the command into the mini terminal instead of hidden exec.
7. **Beginner Git Mode** — one quiet sentence per concept, danger confirmations always show the exact git command, hard-destructive ops simply don't exist in the UI.
8. **"Not opt-out, just absent"** — privacy as the marketing centerpiece (research 10: this framing demonstrably drives adoption).
9. **Platform-true keys** — macOS Cmd+letter / Windows Ctrl+Shift+letter; the shell's plain-Ctrl keys are never stolen; Ctrl+S/W only when the editor owns focus.
10. **Single-slot dock** — only one panel at a time beside the terminal. The discipline that keeps DockTerm from becoming an IDE.

## 5. Top 5 must-haves (V1 dies without these)

1. Rock-solid terminal running Claude Code's TUI on Windows + macOS (resize, paste, unicode, Shift+Enter, high-throughput streaming).
2. The Review Arc (changed files → diff → stage → commit).
3. Checkpoints + "changed since" views (commit / checkpoint / session).
4. Git safety layer (confirmations, force-with-lease only, no hard reset, friendly no-upstream/no-remote flows).
5. MCP + Skills panels (parse-only, masked) — the differentiator no competitor ships terminal-first.

## 6. What to avoid (anti-scope, locked)

- AI chat panel, AI API calls, "ask Claude" buttons — Claude Code IS the AI; we're the workspace.
- LSP/intellisense, debugger, extension system, plugin marketplace, themes gallery.
- Terminal tabs/splits/profiles/SSH — iTerm/Warp/Ghostty own that; one main + one mini only.
- Merge-conflict resolution UI (detect + banner + point to terminal).
- Hard reset, bare `--force` push, branch delete of unmerged work without explicit double confirm.
- Auto-running anything: MCP servers, Claude CLI, package scripts, git hooks (`core.hooksPath=` neutralized).
- Accounts, telemetry, update phone-home, cloud sync, token storage.
- Light theme in V1 (dark + accent presets only).

## 7. Final V1 scope (MoSCoW)

**Must:** project open/reopen + empty state + git-repo detection (+ optional `git init` w/ confirm) · main terminal (xterm 5.5 + node-pty, WebGL→DOM fallback, search, copy/paste, font settings) · bottom mini terminal · file tree (ignores, badges, CRUD w/ confirm) · Monaco editor (tabs, dirty dots, Ctrl/Cmd+S, external-change guard, binary/huge block) · Git panel (status groups, stage/unstage, commit modal, push/pull, branch create/switch, upstream publish flow, beginner copy, danger matrix) · Review panel (changed-since commit/checkpoint/session, Monaco diff, stage/commit actions) · checkpoints · top-bar status · MCP panel (project parse default, user opt-in, masking, template, refresh) · Skills panel (project default, user opt-in, open/create from template) · command palette (cmdk: all commands + panel toggles) · settings (fonts, cursor, accent preset, beginner mode, confirmations, user-config opt-in, reset layout) · keyboard scheme (platform-true) · docs set + public repo.

**Should:** terminal search UI polish · project info panel (pm/scripts/frameworks + paste-to-run) · Format Document (only when Monaco has a formatter) · "what changed" summary header (counts, +/- stats) · reveal-in-tree, open-in-editor cross-links.

**Could (only if zero schedule risk):** serialize-addon terminal restore on renderer reload (dev QoL) · OSC-8 link handling beyond defaults · branch list ahead/behind counts.

**Won't (V1):** everything in §6, plus: multi-project windows, multiple checkpoints UI (single active checkpoint; config keeps history), hooks display, MCP health checks, image preview, git log/history graph, auto-update.

## 8. Open questions parked for the approval gate

1. Windows-first dev is forced (the dev machine is Windows 11) while the brief's wording is macOS-centric — plan treats both as first-class with platform-adaptive keys; macOS packaging/signing needs CI or a Mac. OK?
2. GitHub CLI is not installed — at publish step you'll get exact `gh`/manual commands to run (or install `gh` first).
3. `Cmd+M` minimizes windows on macOS → MCP panel uses `Cmd+Shift+M` (Windows: `Ctrl+Shift+M`). OK?
4. Force push: included as `--force-with-lease` behind a typed double-confirm, or omit entirely from V1 UI? Plan currently **includes** it.
