# DockTerm — munu: the face of your Claude sessions

**Status:** approved direction, 2026-06-16. Builds on v0.6.1. Inspired by the mascot
brand kit in `assets/munu/` and the notch technique in adamlyttleapps/notchy.

## Goal
Give DockTerm a living mascot, **munu**, that mirrors what Claude Code is doing across all
panes — and surfaces it **everywhere**, especially a floating always-on-top pill that stays
visible over other apps. While you're watching YouTube with DockTerm in the background, a
glance at munu tells you Claude is **working**, **needs your `[y/n]`**, or **finished** — and
you can approve/deny or jump straight to the right terminal. Identity unchanged: local-only,
no telemetry, munu never calls an AI of its own.

## munu's states (from the brand kit)
`resting` (idle/ready) · `happy` (done / tree clean) · `working` (busy) · `sleeping`
(no project) · `asking` (Claude needs `[y/n]`). Art: `assets/munu/munu*.svg`.

## Where munu appears
1. **Floating overlay (hero).** An always-on-top, transparent, click-through-except-the-pill
   window. macOS: a Dynamic-Island pill centered over the notch; Windows/Linux: a floating
   pill at top-center. Visible over fullscreen apps and all Spaces. Shows munu + a tiny status;
   **expands** to the permission card when asking, and pulses on "done".
2. **In-app munu.** A small munu face in the DockTerm top bar reflecting *that window's* state;
   click → popover with per-session states + jump.
3. **Tray/menu-bar icon.** The existing tray icon swaps to the munu face for the global state.

## Architecture

### Layer 0 — Branding (`assets/`, `build/`, `electron-builder.yml`, `README.md`)
- App icon → munu: place `assets/munu/icon.icns`, `icon.ico`, `icon.png` into `build/` and point
  `mac.icon` / `win.icon` / `linux.icon` at them. Keep a 512² `icon.png` for Linux/auto-gen.
- Renderer art: copy the munu SVGs to `src/renderer/src/assets/munu/` so Vite can import them.
- README header/logo → the munu kit (`README-snippet.md` content; copy `dockterm-logo*.svg`).

### Layer 1 — Claude-state engine (renderer-side classification)
**Why renderer:** classification needs clean rendered text; xterm already has it (`term.buffer`).
Main only sees raw ANSI bytes. So each terminal classifies itself, like Notchy reads its view.
- `src/renderer/src/components/terminal/claudeStatus.ts` — **pure**, unit-tested. Ported from
  Notchy:
  - `working`: a line beginning with a spinner char (`· ✢ ✳ ✶ ✻ ✽`) + `…`, **or** text
    contains `"esc to interrupt"`.
  - `asking`: text contains `"Esc to cancel"`, **or** a line that (trim-left) starts with `❯ `
    followed by a digit (the permission menu).
  - else `idle`. Also `parseAsk(text)`: best-effort pull of the question/command line(s) shown
    above the menu, for the HUD.
- `useTerminal`: after `pty:data`, debounce ~200 ms, read the buffer (visible rows + last ~40
  scrollback lines via `term.buffer.active`), classify, and call a new `onStatus(state, ask?)`.
  Runs for hidden panes too (their buffers stay current). Dispose the debounce on unmount.

### Layer 2 — State store + aggregation
- `src/renderer/src/state/useMunuStore.ts`: `paneStatus: Record<leafId, {state, ask?}>`,
  `setPaneStatus`. Computes this window's **aggregate** with the Notchy hierarchy
  `done > asking > working > idle` and a **3 s idle→done settle** (so brief flickers don't fire
  "done"). Tracks the leaf(s) currently `asking` (id + tab + parsed command) for jump/answer.
- Each window reports its aggregate + asking-contexts to main via `munu:report`.
- `src/main/services/munuService.ts`: keeps per-window state (by `webContents.id`), computes the
  **global** aggregate, owns the overlay window, relays state, routes answers, and drives polish.

### Layer 3 — Overlay window (`src/main/overlayWindow.ts` + new renderer entry)
- A `BrowserWindow`: `frame:false, transparent:true, resizable:false, skipTaskbar:true,
  focusable:false, hasShadow:false`. macOS: `setAlwaysOnTop(true,'screen-saver')`,
  `setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true})`. Positioned at the top-center of
  the display that has the menu bar; sized to the pill, grown when expanded.
- Click-through everywhere except the pill: `setIgnoreMouseEvents(true,{forward:true})`, toggled
  off while the renderer reports the cursor is over munu/the card (via `munu:setInteractive`).
- New electron-vite renderer entry `overlay.html` → `src/renderer/overlay/main.tsx` rendering
  munu (SVG) + animations, subscribed to `munu:state`. The overlay can be disabled in Settings.

### Layer 4 — Permission HUD + actions
- On `asking`, the overlay (and in-app popover) shows the parsed command/question + **[y] yes /
  [n] no** + **Open terminal**.
- `[y]` → send `\r` (accept Claude's pre-highlighted "Yes"); `[n]` → send `\x1b` (Esc / cancel).
  Always explicit; the exact keystroke is shown; **never auto-answered**. Routed
  overlay → `munu:answer{leafId, key}` → main → originating window → `pty:write` to that pane.
- **Open terminal** → `munu:focusPane{windowId, tabId, leafId}` → main raises that window and
  focuses the pane.
- *Risk:* Claude's menu layout can vary; Enter/Esc is the robust common case, and jump-to-pane
  is always available as the exact fallback.

### Layer 5 — Polish (all off-able in Settings → munu)
- **Sounds:** subtle cues on enter-`asking` and on `done` (bundled tiny audio; played in the
  overlay renderer). Off by default? No — on, but a single toggle.
- **Attention:** munu bounces + amber glow on `asking`; gentle pop on `done`.
- **Keep awake:** main `powerSaveBlocker('prevent-display-sleep')` while any session is `working`;
  released when none are.
- **Notification:** when DockTerm is unfocused and a session enters `asking`/`done`, fire an OS
  `Notification` (click → focus that pane). Throttled.

## IPC (added to the typed contract + allowlist)
- `munu:report` (renderer→main): `{ state, asks: Ask[] }` for the calling window.
- `munu:state` (main→overlay event): global `{ state, asks, counts }`.
- `munu:answer` (overlay→main): `{ windowId, leafId, key:'\r'|'\x1b' }`.
- `munu:focusPane` (overlay→main): `{ windowId, tabId, leafId }`.
- `munu:setInteractive` (overlay→main): `{ interactive: boolean }` to toggle click-through.

## Settings (`settings.munu`)
`enabled`, `overlay` ('notch'|'floating'|'off'), `sounds`, `attention`, `keepAwake`,
`notifications`. Defaults: enabled on, overlay on, all polish on. Persisted; a section in
Settings.

## Security
- munu is read-only inference over text DockTerm already renders; no new file/network access.
- The ONLY thing written anywhere is a single keystroke (`\r`/`\x1b`) into a pane, and only on an
  explicit user click. The keystroke is shown before sending. No auto-approval, ever.
- Overlay window uses the same sandbox/contextIsolation/CSP as the main windows; loads local only.

## Testing
- Unit: `classify()` and `parseAsk()` against captured Claude snippets (working spinner line,
  `esc to interrupt`, `❯ 1.` menu, `Esc to cancel`, plain idle) → expected states; aggregation
  hierarchy + 3 s settle; map `[y]/[n]`→keystroke.
- Manual: run `claude`, trigger a permission prompt → munu shows asking on the overlay over a
  fullscreen app; `[y]`/`[n]` answer it; background tab working flips munu; "done" pulse + sound;
  multi-window/global aggregate; overlay off in Settings.

## Non-goals
- Reading Claude's internal API/state (we infer from terminal text only).
- Perfectly parsing every Claude menu variant (Enter/Esc + jump covers it).
- Notch overlay on non-macOS uses a floating pill, not a real OS island.

## Build order (phased — each phase ships working)
1. **Branding** — icons + README/logo. (no behavior risk)
2. **Engine** — `claudeStatus.ts` + `useTerminal` hook + `useMunuStore` + **in-app top-bar munu**
   reacting to state (no overlay yet). Delivers value immediately, fully cross-platform.
3. **Overlay** — overlay window + renderer entry + `munu:report`/`munu:state`; munu floats and
   reacts globally.
4. **Permission HUD + actions** — asking card with `[y]/[n]` + jump (overlay + in-app).
5. **Polish** — sounds, attention, keep-awake, notifications + Settings → munu.
