# 03 — Terminal Engineering

**Project:** DockTerm  
**Date:** 2026-06-11  
**Author:** Terminal Engineering Agent (planning phase)  
**Status:** Research complete — no app code exists yet

---

## Table of Contents

1. [Findings](#findings)
   - [1. xterm.js — Package Names, Versions, Addons, Renderers](#1-xtermjs)
   - [2. node-pty — Version, Windows Backend, Electron Integration](#2-node-pty)
   - [3. Process Architecture — PTY Hosting and IPC Design](#3-process-architecture)
   - [4. Shell Selection and Environment](#4-shell-selection-and-environment)
   - [5. Copy/Paste and Key Handling](#5-copypaste-and-key-handling)
   - [6. Rejected Alternatives](#6-rejected-alternatives)
2. [Risks](#risks)
3. [Decisions (Recommended)](#decisions-recommended)
4. [Rejected Ideas](#rejected-ideas)
5. [V1 Recommendations](#v1-recommendations)

---

## Findings

### 1. xterm.js

#### 1.1 Package Names and Latest Stable Version

As of xterm.js 5.4.0 (March 2024), the project migrated all packages to the `@xterm/` npm scope. Legacy packages (`xterm`, `xterm-addon-*`) are deprecated and must not be used in new projects.

The latest stable release is **`@xterm/xterm` 5.5.0** (April 5, 2024). A major release **6.0.0** shipped December 22, 2024, with significant breaking changes detailed below. The `5.x` line (specifically 5.5.0) is the last stable minor series before the 6.0 breaking changes. VS Code's own integration was tracking a custom fork at `xterm@5.6.0-beta.97` as of early 2025, showing continued active use of the 5.x line.

The 6.0.0 release removes the `@xterm/addon-canvas` addon entirely and drops several deprecated options (`windowsMode`, `fastScrollModifier`). Projects should evaluate 6.0 readiness before adopting it.

Sources:
- [xterm.js releases — GitHub](https://github.com/xtermjs/xterm.js/releases)
- [xterm.js download guide](https://xtermjs.org/docs/guides/download/)
- [@xterm/xterm on npm](https://www.npmjs.com/package/@xterm/xterm)

#### 1.2 Addons — Which Exist, Which We Need

All addons are now scoped under `@xterm/`. The following table lists all relevant addons confirmed as of June 2026:

| Package | Latest Version | Purpose | Needed for DockTerm? |
|---|---|---|---|
| `@xterm/addon-fit` | **0.11.0** | Fits terminal to containing element (cols×rows from DOM size) | YES — critical |
| `@xterm/addon-search` | **0.16.0** | In-terminal text search with decorations | YES — V1 |
| `@xterm/addon-web-links` | **0.12.0** | Clickable URL detection and OSC 8 hyperlinks | YES — V1 |
| `@xterm/addon-webgl` | **0.19.0** | WebGL2 GPU-accelerated renderer (primary renderer target) | YES — primary renderer |
| `@xterm/addon-unicode11` | current with core | Unicode 11 character width tables | YES — mandatory |
| `@xterm/addon-unicode-graphemes` | experimental (5.4+) | Grapheme cluster width (emoji, ZWJ sequences) | DEFER to V2 — see note |
| `@xterm/addon-serialize` | **0.14.0** | Serialize terminal buffer to string/HTML (session restore) | YES — V1 for restart UX |
| `@xterm/addon-canvas` | **REMOVED in 6.0** | Canvas-based renderer (fallback) | NO — removed in 6.0 |
| `@xterm/headless` | current | Headless terminal (testing/CI) | NO for app, YES for tests |

**Note on `@xterm/addon-unicode-graphemes`:** Introduced experimentally in 5.4.0, this addon handles grapheme clusters (compound emoji via ZWJ, multi-codepoint sequences). It was not formally published to npm as of the last confirmed check (GitHub issue #5147 tracked "missing npm package"). As of xterm.js 6.0, status is unknown — verify before adopting. Without it, compound emoji will render with incorrect width but the terminal remains usable.

Sources:
- [@xterm/addon-fit on npm](https://www.npmjs.com/package/@xterm/addon-fit)
- [@xterm/addon-search on npm](https://www.npmjs.com/package/@xterm/addon-search)
- [@xterm/addon-web-links on npm](https://www.npmjs.com/package/@xterm/addon-web-links)
- [@xterm/addon-webgl on npm](https://www.npmjs.com/package/@xterm/addon-webgl)
- [@xterm/addon-serialize on npm](https://www.npmjs.com/package/@xterm/addon-serialize)
- [unicode graphemes missing package issue](https://github.com/xtermjs/xterm.js/issues/5147)
- [@xterm/addon-canvas deprecated in v6 — Cockpit issue](https://github.com/cockpit-project/cockpit/issues/22509)

#### 1.3 Renderer Guidance in 2026

**xterm.js uses the DOM renderer by default.** The Canvas renderer was moved into an addon (`@xterm/addon-canvas`) in xterm.js 5.x, then **removed entirely in 6.0**. There is no canvas fallback in 6.0+.

**Renderer hierarchy (as of xterm.js 6.0):**

1. **WebGL addon (`@xterm/addon-webgl`)** — Primary. WebGL2-based, GPU-accelerated, up to 900% faster than the old Canvas renderer. Required for acceptable performance with Claude Code's high-throughput ANSI output. Actively maintained (0.19.0 published within the last month of the research date). Supports shadow DOM as of 6.0. Load with `terminal.loadAddon(new WebglAddon())`.

2. **DOM renderer** (built-in, no addon) — Fallback when WebGL2 is unavailable (e.g., GPU blocklisted, headless Chromium, Electron with `--disable-gpu`). Significantly improved in xterm.js 5.3.0 ("significantly faster" DOM renderer). Usable but visibly slower at high throughput.

**Recommended strategy for DockTerm:**
```typescript
const webglAddon = new WebglAddon();
webglAddon.onContextLoss(() => {
  webglAddon.dispose();
  // Fall through to DOM renderer automatically
});
terminal.loadAddon(webglAddon);
```

Catch WebGL context loss events and dispose the addon; xterm.js automatically falls back to DOM. Do not use `@xterm/addon-canvas` — it is removed in 6.0 and should not be used with 6.0.

Sources:
- [WebGL vs Canvas Discussion — GitHub](https://github.com/xtermjs/xterm.js/discussions/4432)
- [xterm.js 6.0 release notes](https://github.com/xtermjs/xterm.js/releases/tag/6.0.0)
- [@xterm/addon-webgl on npm](https://www.npmjs.com/package/@xterm/addon-webgl)

#### 1.4 Scrollback Configuration

```typescript
const terminal = new Terminal({
  scrollback: 10000,  // lines; default is 1000
  // Do NOT set to Infinity or very large values
});
```

Memory cost: a 160×24 terminal with 5000 scrollback lines consumes ~34 MB. For DockTerm's hero terminal where Claude Code may emit many thousands of lines, 10,000 is a reasonable ceiling. The `@xterm/addon-serialize` addon allows serializing the buffer for session restore without keeping it all in memory. Consider exposing scrollback as a user setting (5000–50000 range).

#### 1.5 Performance with High-Throughput Output (Claude Code)

Claude Code streams dense ANSI sequences during thinking/tool-use phases. Key mitigations:

1. **WebGL renderer** (see §1.3) — eliminates CPU painting bottleneck.
2. **Flow control** (see §3.3) — prevents write buffer overflow (hardcoded 50 MB discard limit).
3. **`rescaleOverlappingGlyphs: true`** option (added in xterm.js 5.5.0) — GPU-side glyph rescaling, important for powerline/nerd font characters Claude Code uses.
4. Avoid synchronous DOM layout during writes; the FitAddon `fit()` call is moderately expensive — debounce resize events (100ms).

#### 1.6 Bracketed Paste

xterm.js supports bracketed paste mode natively. The shell signals support via `\x1b[?2004h`; xterm.js wraps pastes in `\x1b[200~` ... `\x1b[201~` automatically.

Added option in xterm.js 5.3.0: `ignoreBracketedPasteMode: boolean` (default `false`). Leave it at `false` for correct Claude Code behavior. Do not force-disable bracketed paste.

#### 1.7 OSC 8 Hyperlinks

Supported natively since xterm.js 5.0.0 (September 2022) via the link handling API. The `@xterm/addon-web-links` addon handles implicit URL detection via regex. OSC 8 explicit hyperlinks (used by some Claude Code output like file paths) are handled by xterm.js core. Wire up the `ITerminalOptions.linkHandler` for custom click behavior if opening files in the app.

Sources:
- [xterm.js link handling guide](https://xtermjs.org/docs/guides/link-handling/)
- [OSC 8 adoption tracker](https://github.com/Alhadis/OSC8-Adoption)

#### 1.8 IME / CJK / Emoji

- **IME composition** (Chinese, Japanese, Korean via input method) is supported. Known edge cases: Sogou IME `compositionend` handling, caps lock interaction. These have been progressively patched; xterm.js 6.0 includes accumulated IME fixes.
- **CJK wide characters**: handled by Unicode 11 tables. Load `@xterm/addon-unicode11` and activate: `terminal.unicode.activeVersion = '11'`.
- **Emoji / grapheme clusters**: Basic emoji width is handled by Unicode 11 tables (most single-codepoint emoji). Compound emoji (ZWJ sequences like 👩‍🚀) may render incorrectly because `@xterm/addon-unicode-graphemes` is not yet stable on npm. This is a known xterm.js limitation and does not affect Claude Code's TUI output (which does not emit complex emoji sequences).

Sources:
- [grapheme cluster issue](https://github.com/xtermjs/xterm.js/issues/3304)
- [IME issues tracker](https://github.com/xtermjs/xterm.js/issues/469)

---

### 2. node-pty

#### 2.1 Latest Version

**Stable: `node-pty` 1.1.0** — published approximately mid-2024.  
**Beta: `node-pty` 1.2.0-beta.13** — released May 13, 2024 (most recent tag as of research).

The 1.2.0-beta series contains important fixes:
- **beta.7** (Jan 2024): Removed winpty support entirely; Windows is now ConPTY-only.
- **beta.11** (Feb 2024): Fixed debugger-induced freeze on Windows (deferred native connection calls).
- **beta.12** (Mar 2024): Updated bundled ConPTY to 1.25.260303002.
- **beta.13** (May 2024): Fixed use-after-free from unsynchronized PTY handle access on Windows.

The 1.2.0-beta series is what VS Code ships (it maintains its own internal fork tracking beta). For DockTerm V1, use **`node-pty@1.1.0`** (stable) initially, then evaluate upgrading to 1.2.0 stable when it releases.

There is also an unofficial **`@lydell/node-pty@1.2.0-beta.12`** (scoped fork, smaller distribution, published March 2024) that some projects use as a smaller alternative.

Sources:
- [node-pty releases — GitHub](https://github.com/microsoft/node-pty/releases)
- [node-pty on npm](https://www.npmjs.com/package/node-pty)

#### 2.2 Windows Backend: ConPTY

**winpty has been removed.** As of node-pty 1.2.0-beta.7, Windows support is ConPTY-only.

- **Requirement:** Windows 10 version 1809 (build 17763) or later. Windows 11 23H2 (the dev target) is fully compliant.
- **`useConpty` option:** No longer needed — there is no fallback. The option was present in earlier versions to disable ConPTY, which is now moot.
- **`conptyDll` option:** Not present in the stable 1.1.0 API; VS Code uses internal mechanisms to load a specific ConPTY DLL version. DockTerm does not need this for V1.

**Known Windows issues (as of research date):**

| Issue | Status |
|---|---|
| Orphaned `conhost.exe` after PTY close | Historically present; mitigated in 1.2.0-beta.x series |
| Debugger freeze (e.g., when debugging Electron main process) | Fixed in beta.11 via deferred connection |
| Use-after-free on PTY handle | Fixed in beta.13 |
| ConPTY screen buffer resize hanging `conhost.exe` | Legacy issue, pre-1.0; confirmed resolved in ConPTY 1809+ |

**Action item:** DockTerm must not spawn node-pty under a Node.js debugger on Windows during development. Use the main process normally.

Sources:
- [winpty removed — issue #714](https://github.com/microsoft/node-pty/issues/714)
- [ConPTY integration on DeepWiki](https://deepwiki.com/microsoft/node-pty/4.4-conpty-integration)
- [orphaned conhost issue](https://github.com/microsoft/node-pty/issues/471)

#### 2.3 Prebuilt Binaries vs. node-gyp Compilation

**node-pty 1.1.0 does NOT ship prebuilt binaries** via the main package. It compiles from source using `node-gyp` on install. This is a first-class contributor pain point.

**Windows build requirements (confirmed):**
- Visual Studio 2022 Community with "Desktop development with C++" workload
- MSVC v143 toolset
- **MSVC v143 — VS 2022 C++ x64/x86 Spectre-mitigated libs** (individual component — commonly missed, causes MSB8040 errors)
- Python 3.x (for node-gyp)
- Windows SDK

Dev machine already has VS 2022 Community with VC++ toolset — meets requirements. Confirm Spectre-mitigated libs are installed.

**macOS build requirements:**
- Xcode Command Line Tools (`xcode-select --install`)
- No additional setup needed for Apple Silicon or Intel.

**Alternative prebuilt approaches:**
- `node-pty-prebuilt-multiarch` / `@homebridge/node-pty-prebuilt-multiarch` — third-party forks with prebuilt binaries for specific Node/Electron ABI combos. These are community-maintained and may lag behind official node-pty. Not recommended for V1 unless build issues block contributors.
- Building and caching prebuilds via `prebuildify` (used by the 1.2.0-beta release pipeline) — recommended for future CI distribution.

#### 2.4 Electron ABI Mismatch — Rebuild Story

Native modules compiled for Node.js (v24.15.0 in this case) use a different ABI from the Electron runtime. **node-pty will fail to load in Electron unless rebuilt.**

**Recommended approach: `@electron/rebuild`**

```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild
```

This must run after `npm install` and after any Electron version upgrade. Add it to `package.json` scripts:

```json
{
  "scripts": {
    "rebuild": "electron-rebuild",
    "postinstall": "electron-rebuild"
  }
}
```

**electron-builder alternative:** If using electron-builder, run `electron-builder install-app-deps` which internally calls rebuild.

**`asarUnpack` configuration:** node-pty's compiled `.node` file (`pty.node`) **cannot be inside an ASAR archive** — native modules must be loaded from the filesystem. electron-builder detects and unpacks native modules automatically. With Electron Forge/Vite, configure explicitly:

```json
// In electron-builder configuration:
{
  "asarUnpack": ["**/node_modules/node-pty/**"]
}
```

Additionally, `spawn-helper` (macOS/Linux) must be available at the expected path outside the ASAR. Verify this in post-package hooks.

**Contributor setup checklist:**
- Windows: VS 2022 with C++ workload + Spectre libs + Python 3.x
- macOS: Xcode CLT
- Both: Run `npm install` then `npx electron-rebuild` (or rely on postinstall hook)

Sources:
- [Native Node Modules — Electron docs](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [Electron Forge + node-pty — Medium](https://thomasdeegan.medium.com/electron-forge-node-pty-9dd18d948956)
- [node-pty + Electron issue #728](https://github.com/microsoft/node-pty/issues/728)
- [node-pty Windows prerequisite issue #645](https://github.com/microsoft/node-pty/issues/645)

---

### 3. Process Architecture

#### 3.1 Where PTYs Should Live: utilityProcess vs. Main Process

**Recommendation: Electron `utilityProcess`** (not the main process).

VS Code migrated its PTY host from a child of the shared process into a standalone `utilityProcess` (issue #175335, closed via PR #182631, released in VS Code Insiders). The rationale: isolate terminal operations so that a crashed or hung PTY host does not bring down the main process or freeze the UI.

**`utilityProcess` benefits:**
- Runs in its own Node.js environment
- Can communicate with the main process and renderer via `MessagePort` (fast, structured clone, no JSON serialization overhead)
- If it crashes, it can be restarted without killing the app
- Offloads CPU-intensive ANSI parsing and PTY I/O from the main process

**Architecture for DockTerm:**

```
Renderer (React/xterm.js)
  ↕  MessagePort (port forwarded from main)
Main Process
  ↕  IPC / MessagePort
utilityProcess (ptyHost.js)
  ↕  node-pty
Shell Process (claude / powershell / zsh)
```

The main process spawns the `utilityProcess`, creates a `MessageChannelMain`, sends one port to the utility process and forwards the other to the renderer via `webContents.postMessage`. From that point, renderer↔ptyHost communicate directly over the MessagePort without main process involvement for data flow.

Sources:
- [utilityProcess API — Electron docs](https://www.electronjs.org/docs/latest/api/utility-process)
- [Adopt utility process for PTY host — VS Code issue #175335](https://github.com/microsoft/vscode/issues/175335)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)

#### 3.2 IPC Streaming Design: Batching and Coalescing

Raw PTY output arrives in small chunks (sometimes byte-by-byte for echo). Sending each chunk over IPC introduces significant overhead. **Batch and coalesce before forwarding to the renderer.**

**Recommended batching strategy:**

```typescript
// In utilityProcess (ptyHost.js)
const FLUSH_INTERVAL_MS = 8;   // ~120fps, imperceptible latency
const BATCH_SIZE_LIMIT = 65536; // 64KB max batch before forced flush

let buffer = '';
let flushTimer: NodeJS.Timeout | null = null;

pty.onData((chunk: string) => {
  buffer += chunk;
  if (buffer.length >= BATCH_SIZE_LIMIT) {
    flushImmediate();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushImmediate, FLUSH_INTERVAL_MS);
  }
});

function flushImmediate() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (buffer.length === 0) return;
  rendererPort.postMessage({ type: 'data', payload: buffer });
  buffer = '';
}
```

This ensures:
- Maximum latency per keystroke echo: 8ms (imperceptible)
- High-throughput output (Claude Code streaming): coalesced into large chunks, reducing IPC round-trips
- No 50ms+ latency that would make the terminal feel sluggish

#### 3.3 Flow Control / Backpressure

xterm.js's `write()` method is non-blocking but has a hardcoded 50 MB internal buffer limit. At very high throughput (Claude Code tool-use output can reach MB/s), the buffer can fill. Use the documented watermark pattern:

```typescript
// In renderer process, after receiving data from MessagePort
const HIGH_WATERMARK = 100_000; // bytes
const LOW_WATERMARK  = 10_000;  // bytes
let pendingBytes = 0;

rendererPort.onmessage = (event) => {
  const { payload } = event.data;
  pendingBytes += payload.length;

  terminal.write(payload, () => {
    pendingBytes = Math.max(pendingBytes - payload.length, 0);
    if (pendingBytes < LOW_WATERMARK) {
      rendererPort.postMessage({ type: 'resume' }); // signal ptyHost
    }
  });

  if (pendingBytes > HIGH_WATERMARK) {
    rendererPort.postMessage({ type: 'pause' }); // signal ptyHost
  }
};

// In ptyHost: respond to pause/resume
mainPort.onmessage = (event) => {
  if (event.data.type === 'pause') pty.pause();
  if (event.data.type === 'resume') pty.resume();
};
```

Keep `HIGH_WATERMARK` under 500KB as documented by the xterm.js flow control guide. The `LOW_WATERMARK` should be 10–20% of HIGH to avoid excessive pause/resume toggles.

Source: [xterm.js flow control guide](https://xtermjs.org/docs/guides/flowcontrol/)

#### 3.4 Resize Protocol

```typescript
// In renderer: FitAddon drives size calculation
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);

function handleResize() {
  fitAddon.fit(); // updates terminal.cols, terminal.rows
  rendererPort.postMessage({
    type: 'resize',
    cols: terminal.cols,
    rows: terminal.rows
  });
}

// Debounce window resize events (100ms)
window.addEventListener('resize', debounce(handleResize, 100));

// In ptyHost:
if (event.data.type === 'resize') {
  pty.resize(event.data.cols, event.data.rows);
}
```

**Important:** Always call `fitAddon.fit()` first, then read `terminal.cols`/`terminal.rows`, then send to PTY. Never compute cols/rows independently. Call `handleResize()` immediately after mounting the terminal container and any time the panel layout changes.

Known FitAddon issue: resizing can be incorrect if the containing element has non-integer pixel dimensions or CSS `box-sizing` issues. Use `box-sizing: border-box` and integer pixel dimensions on the terminal container.

#### 3.5 PTY Lifecycle

**Spawning:**
```typescript
const pty = nodePty.spawn(shellPath, shellArgs, {
  name: 'xterm-256color',
  cols: terminal.cols,
  rows: terminal.rows,
  cwd: projectRoot,          // cwd = project root, not home dir
  env: {
    ...process.env,          // inherit parent env
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8',     // or user's LANG if detectable
    // Remove TERM_PROGRAM if set to avoid VS Code detection
  }
});
```

**Kill on window close:**

- **macOS/Linux:** `pty.kill('SIGHUP')` — the shell receives SIGHUP (session hangup) and exits gracefully. Child processes spawned by the shell (including the `claude` process) receive SIGHUP from the PTY closing.
- **Windows:** `pty.kill()` — sends WM_CLOSE equivalent via ConPTY. Process tree cleanup is handled by ConPTY. For stubborn processes, use `taskkill /pid PID /T /F` via `child_process.execSync`.
- Add `app.on('will-quit', ...)` handler in the main process to ensure the utility process is terminated before the app exits.

**Restart-on-exit UX:**
- Watch `pty.onExit(({ exitCode }) => {...})`.
- Display exit code and "Press any key to restart" prompt to the user (write to the terminal, not a modal).
- Do not auto-restart immediately — allow user to read last output.

---

### 4. Shell Selection and Environment

#### 4.1 macOS

**Shell detection order:**
1. `process.env.SHELL` — set by the OS to the user's login shell (`/bin/zsh` on macOS Catalina+, `/bin/bash` on older systems)
2. Fallback: `/bin/zsh`

**Spawn as login shell with `-l` flag:**
```typescript
const shell = process.env.SHELL || '/bin/zsh';
const pty = nodePty.spawn(shell, ['-l'], { ... });
```

The `-l` flag triggers `/usr/libexec/path_helper` which reconstructs `PATH` from `/etc/paths` and `/etc/paths.d/`. This is how macOS sets up the correct `PATH` for GUI apps where the login environment is not inherited. Without `-l`:
- nvm-managed Node.js will not be on PATH
- Homebrew-installed tools may not be found
- `claude` itself may not be in PATH (installed via npm global or Homebrew)

**Note:** Do not pass `-i` (interactive) together with `-l` for PTY spawns — the PTY itself implies interactive. Some shells behave differently with both flags simultaneously.

Sources:
- [shell-path npm package](https://www.npmjs.com/package/shell-path)
- [VS Code NVM integration gist](https://gist.github.com/stormwild/8ff4328c6f8b92ba4d4b4a0908c324f6)

#### 4.2 Windows

**Shell detection order:**
1. `process.env.COMSPEC` — typically `C:\Windows\System32\cmd.exe`
2. Check for PowerShell Core: `%ProgramFiles%\PowerShell\7\pwsh.exe` (exists if installed)
3. Check for Windows PowerShell: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` (always present on Windows 7+)

**Recommended detection logic:**
```typescript
import { existsSync } from 'fs';
import { join } from 'path';

function detectWindowsShell(): string {
  const pwshPath = join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'PowerShell\\7\\pwsh.exe');
  if (existsSync(pwshPath)) return pwshPath;

  const ps5Path = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  if (existsSync(ps5Path)) return ps5Path;

  return process.env.COMSPEC ?? 'cmd.exe';
}
```

**Note for DockTerm's own development machine:** Dev machine has PowerShell 5.1 only (`powershell.exe`), not pwsh. The app should use whichever shell the user has, defaulting to PowerShell 5.1 on this machine.

**No `-l` equivalent on Windows.** Environment is fully inherited from the parent process. Ensure the app itself is launched from a properly-configured shell (or set PATH explicitly).

#### 4.3 Required Environment Variables

Set these for all PTY sessions:

```typescript
{
  TERM: 'xterm-256color',
  COLORTERM: 'truecolor',
  LANG: process.env.LANG || 'en_US.UTF-8',   // UTF-8 required for Claude Code
}
```

**Do not override:**
- `HOME`, `USER`, `LOGNAME`, `SHELL` — inherit from parent
- `PATH` — inherit (macOS adds via `-l` flag)

#### 4.4 Claude Code TUI Specifics

Claude Code is a Node.js TUI that runs fine inside VS Code's integrated terminal (which is xterm.js). Key requirements confirmed from the official docs and community:

1. **Kitty keyboard protocol for Shift+Enter:** Claude Code requires the Kitty keyboard protocol (or similar CSI-u extended key encoding) to distinguish `Shift+Enter` from `Enter`. xterm.js **does not emit Kitty protocol escape sequences by default**. This must be explicitly enabled.

   VS Code's `/terminal-setup` command writes the required escape sequences to configure xterm.js. For DockTerm, we must enable extended key encoding directly in xterm.js:
   ```typescript
   const terminal = new Terminal({
     allowProposedApi: true, // required for some options
   });
   // xterm.js 5.x+: enable CSI-u (Kitty-compatible) encoding
   // This is set via terminal options or the kitty keyboard protocol
   ```
   Specifically: set `terminal.options.windowOptions` or write `\x1b[>4;1m` (Kitty protocol modifier keys mode) to the PTY on startup after the shell is ready.

2. **GPU acceleration note:** The official Claude Code docs say VS Code's `/terminal-setup` sets `terminal.integrated.gpuAcceleration` to `"off"` to prevent garbled text. This suggests there may be xterm.js WebGL rendering edge cases with Claude Code's TUI output. **DockTerm should test the WebGL renderer specifically with Claude Code running** and have a fallback to DOM renderer.

3. **Fullscreen TUI mode:** Claude Code's TUI uses the alternate screen buffer (DECSET 1049h). xterm.js handles alternate screen correctly. No special configuration needed.

4. **Mouse support:** Claude Code supports mouse events for scrolling in fullscreen mode. xterm.js enables mouse event reporting automatically when the application requests it (via DECSET 1000h/1006h). No special configuration needed.

5. **Cursor styles:** Claude Code may change cursor style (block/bar/underline) via DECSCUSR sequences. xterm.js supports these natively.

6. **TERM variable:** Must be `xterm-256color`. Claude Code uses this to detect color support.

7. **`CLAUDE_CODE_NO_FLICKER=1`:** Setting this env var switches Claude Code to fullscreen TUI mode, which reduces flickering with alternating screen writes. Recommended for embedding inside DockTerm.

Sources:
- [Claude Code terminal configuration — official docs](https://code.claude.com/docs/en/terminal-config)
- [Shift+Enter explanation — DEV Community](https://dev.to/richardbray/why-shiftenter-doesnt-work-in-claude-code-and-how-to-fix-it-10f7)
- [Shift+Enter terminal keyboard protocol blog post](https://blog.fsck.com/agent-blog/2026/02/26/terminal-keyboard-protocol/)
- [Claude Code TUI overrides clipboard — GitHub issue #43942](https://github.com/anthropics/claude-code/issues/43942)

---

### 5. Copy/Paste and Key Handling

#### 5.1 Platform Conventions

| Platform | Copy | Paste | Right-click |
|---|---|---|---|
| macOS | `Cmd+C` (or auto-copy on select) | `Cmd+V` | Paste (optional) |
| Windows | `Ctrl+Shift+C` (Windows Terminal convention) | `Ctrl+Shift+V` | Paste (Windows Terminal convention) |
| Linux | `Ctrl+Shift+C` / `Ctrl+Shift+V` | Same | Paste (common) |

`Ctrl+C` and `Ctrl+V` must **not** be intercepted for copy/paste — `Ctrl+C` sends `SIGINT` to the shell, which is essential for Claude Code interaction.

#### 5.2 What xterm.js Handles Natively

xterm.js does **not** automatically bind copy/paste to system clipboard. It handles:
- **Selection** via mouse drag and `Shift+Click` — populates internal selection buffer
- **`ITerminalOptions.copyOnSelect`** — if `true`, automatically copies selection to clipboard (useful for macOS behavior)
- **Right-click** — no default paste behavior; must be wired manually

#### 5.3 What We Must Wire

```typescript
// macOS: Cmd+C to copy, Cmd+V to paste
// Windows: Ctrl+Shift+C to copy, Ctrl+Shift+V to paste

const isMac = process.platform === 'darwin';

terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
  // Copy
  const isCopy = isMac
    ? event.metaKey && event.key === 'c' && terminal.hasSelection()
    : event.ctrlKey && event.shiftKey && event.key === 'C';

  if (isCopy) {
    const text = terminal.getSelection();
    if (text) navigator.clipboard.writeText(text);
    return false; // prevent propagation to terminal
  }

  // Paste
  const isPaste = isMac
    ? event.metaKey && event.key === 'v'
    : event.ctrlKey && event.shiftKey && event.key === 'V';

  if (isPaste) {
    navigator.clipboard.readText().then(text => {
      terminal.paste(text); // uses xterm.js paste (respects bracketed paste)
    });
    return false;
  }

  return true; // pass all other keys to terminal
});

// Right-click paste on Windows (convention from Windows Terminal)
if (!isMac) {
  terminalElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    navigator.clipboard.readText().then(text => terminal.paste(text));
  });
}
```

Use `terminal.paste(text)` not `terminal.write(text)` for paste — this respects bracketed paste mode and the `ignoreBracketedPasteMode` option.

#### 5.4 Search via Search Addon

```typescript
const searchAddon = new SearchAddon();
terminal.loadAddon(searchAddon);

// Wire to Ctrl+F / Cmd+F
function openSearch() { /* show search UI overlay */ }

searchAddon.findNext('query', { caseSensitive: false, wholeWord: false, regex: false });
searchAddon.findPrevious('query', { ... });
```

The search addon handles decoration highlighting within the xterm.js canvas/WebGL renderer. Present a floating search bar UI (not a modal) positioned over the terminal.

---

### 6. Rejected Alternatives

#### 6.1 `child_process` with stdio pipes

**Rejected.** `child_process.spawn()` with `stdio: 'pipe'` does not allocate a PTY. The spawned process detects it is not connected to a TTY (via `isatty()` syscall on POSIX, or equivalent on Windows). Consequences:
- Processes disable ANSI color codes (`TERM` is irrelevant without a TTY)
- Claude Code's TUI will not initialize (it checks for TTY)
- Readline-based shells output differently (no interactive prompt formatting)
- Arrow keys, `Ctrl+C`, cursor positioning: none of these work correctly without a PTY

#### 6.2 WebSocket PTY bridges (e.g., xterm.js + WebSocket + pty server)

**Rejected for V1.** This architecture (used by tools like ttyd, wetty, shell-in-a-box) introduces:
- A separate WebSocket server process (port management, security surface)
- Network latency even when local
- Authentication/security concerns for local access
- Unnecessary complexity for an Electron app where main process and renderer are co-located

#### 6.3 ssh2 library

**Rejected.** `ssh2` is for tunneling to remote SSH servers. DockTerm V1 targets local terminal sessions only. Adds OpenSSH dependency complexity with no benefit over node-pty for local shells.

#### 6.4 `node-pty` in the Renderer Process

**Rejected.** Electron's renderer process runs in a sandboxed Chromium environment. Native modules like node-pty cannot be loaded in the renderer (contextIsolation, nodeIntegration concerns). PTY must live in a Node.js process: main process or utility process.

#### 6.5 `node-pty` in the Main Process (not utility process)

**Not recommended for production** (acceptable for prototyping). A crash or hang in node-pty (which has had Windows-specific crashes) takes down the entire application. VS Code explicitly migrated away from this pattern. For DockTerm V1, if utility process setup proves too complex initially, main process is an acceptable starting point, but plan the migration early.

---

## Risks

### R1 — node-pty 1.1.0 Stable vs. 1.2.0-beta.13

**Severity: HIGH**

The stable 1.1.0 release does not include the Windows ConPTY hang fixes from beta.11 and beta.13. On Windows, users running DockTerm under a Node.js debugger may encounter freezes (beta.11 fix), and there is a use-after-free race condition on PTY handle access (beta.13 fix). VS Code ships the beta series internally.

**Mitigation:** Track node-pty 1.2.0 stable release; use 1.2.0-beta.13 from the start if willing to accept beta label. Monitor https://github.com/microsoft/node-pty/releases.

### R2 — @xterm/addon-canvas Removed in xterm.js 6.0

**Severity: MEDIUM**

If WebGL is unavailable (GPU blocked, Electron launched with `--disable-gpu`, VMs), the only fallback is the DOM renderer. The DOM renderer is significantly slower at high throughput. There is no canvas middle ground in 6.0+.

**Mitigation:** Implement WebGL context loss handler + DOM renderer fallback. Consider keeping xterm.js at 5.5.0 initially (where `@xterm/addon-canvas` exists as a stable fallback) and upgrading to 6.0 in V2. Test WebGL specifically in Electron.

### R3 — Shift+Enter / Kitty Protocol in xterm.js

**Severity: HIGH for Claude Code UX**

xterm.js does not natively emit Kitty keyboard protocol sequences. Claude Code relies on `Shift+Enter` for newline insertion. Without the correct escape sequence configuration, `Shift+Enter` is indistinguishable from `Enter`.

**Mitigation:** Write `\x1b[>4;1m` (enable modifyOtherKeys mode) or the full Kitty protocol preamble to the PTY input after shell initialization. This is the same fix Claude Code's `/terminal-setup` applies to VS Code. Verify Claude Code receives and acts on this sequence.

### R4 — WebGL Rendering Garbled Text with Claude Code TUI

**Severity: MEDIUM**

The official Claude Code docs explicitly disable GPU acceleration in VS Code's integrated terminal (`terminal.integrated.gpuAcceleration: "off"`) to prevent "garbled text." This is likely a WebGL addon edge case with Claude Code's use of certain ANSI sequences or special characters.

**Mitigation:** Test Claude Code TUI output with `@xterm/addon-webgl` loaded. If garbling occurs, fall back to DOM renderer for DockTerm or investigate the specific sequences causing the issue (may be a powerline/nerd font glyph overlap issue addressable with `rescaleOverlappingGlyphs: true`).

### R5 — node-pty Native Module Build Failures on Contributor Machines

**Severity: MEDIUM**

Missing Spectre-mitigated libraries in VS 2022 are the most common cause of node-pty build failure on Windows. New contributors will hit this without clear error guidance.

**Mitigation:** Document exact VS 2022 component requirements in CONTRIBUTING.md. Provide a `scripts/check-build-deps.ps1` that verifies VS 2022 components. Consider providing prebuilts for common Electron ABI versions (see `prebuildify`).

### R6 — IPC Latency for PTY Data at Scale

**Severity: LOW-MEDIUM**

Electron's `ipcMain`/`ipcRenderer` JSON-serialization path has measurable overhead. MessagePort between utility process and renderer avoids the main process bottleneck but adds complexity.

**Mitigation:** Use `MessagePort` direct communication for data streaming (not `ipcMain.handle`). For V1 prototype, `ipcMain` is acceptable; migrate to `MessagePort` before V1 release.

### R7 — Process Tree Orphan Risk on Windows

**Severity: LOW (mitigated in recent ConPTY)**

Historically, ConPTY could leave orphaned `conhost.exe` processes after PTY close. Fixed in newer ConPTY builds (1.25.x bundled in node-pty 1.2.0-beta.12).

**Mitigation:** Use `pty.kill()` correctly; add a `taskkill` fallback in the window close handler; monitor process explorer during testing.

---

## Decisions (Recommended)

| # | Decision | Rationale |
|---|---|---|
| D1 | Use `@xterm/xterm@5.5.0` initially, upgrade to 6.0 in V2 | 5.5.0 has stable canvas fallback; 6.0 removes it. Claude Code + WebGL compatibility needs verification first. |
| D2 | Primary renderer: `@xterm/addon-webgl@0.19.0`; fallback: DOM (built-in) | WebGL 900% faster; DOM renderer improved in 5.3+; no canvas fallback needed if WebGL context loss is handled |
| D3 | Use `node-pty@1.2.0-beta.13` (not 1.1.0) | Critical Windows bug fixes (debugger freeze, use-after-free); VS Code already ships this internally |
| D4 | PTYs live in `utilityProcess` | VS Code's proven architecture; crash isolation; MessagePort IPC |
| D5 | IPC data path via `MessagePort` | No JSON overhead; no main process hop; direct renderer↔ptyHost |
| D6 | Batch PTY output at 8ms intervals | ~120fps, imperceptible, coalesces Claude Code streaming |
| D7 | Implement watermark flow control (HIGH=100KB, LOW=10KB) | Prevents xterm.js buffer overflow at high throughput |
| D8 | macOS: spawn shell with `-l` flag | Ensures PATH, nvm, Homebrew tools are available in terminal |
| D9 | Windows: detect pwsh → powershell.exe → COMSPEC | Progressive detection; no hard-coded paths |
| D10 | Set `CLAUDE_CODE_NO_FLICKER=1` in spawned environment | Switches Claude Code to fullscreen TUI; eliminates scroll flicker |
| D11 | Enable extended key encoding (`\x1b[>4;1m`) after shell init | Enables Shift+Enter distinction in Claude Code |
| D12 | Copy/paste: platform-native conventions (Cmd+C/V on mac; Ctrl+Shift+C/V + right-click on Windows) | Match user expectations from native terminals |

---

## Rejected Ideas

| Idea | Rejection Reason |
|---|---|
| `child_process` + pipes | No PTY; Claude Code TUI won't function; ANSI disabled |
| WebSocket PTY bridge | Unnecessary network layer; port management; security surface |
| ssh2 | Remote only; no benefit for local V1 |
| node-pty in renderer process | Cannot load native modules in Electron renderer sandbox |
| `@xterm/addon-canvas` as primary renderer | Removed in xterm.js 6.0; WebGL is superior |
| xterm.js legacy `xterm` package (unscoped) | Deprecated since 5.4.0; no updates; no compat with 5.5+/6.0 addons |
| winpty backend | Removed from node-pty 1.2.0-beta.7; Windows 10 1809+ required (satisfied) |
| Infinite scrollback | Memory unbounded; 34MB per 5000 lines × multiple terminals = RAM issue |
| PTY in main process permanently | Crash isolation lost; VS Code moved away from this pattern |
| Auto-restart on exit | Poor UX; user should read last output and choose to restart |

---

## V1 Recommendations

### Exact Packages and Versions

```json
{
  "dependencies": {
    "@xterm/xterm": "5.5.0",
    "@xterm/addon-fit": "0.10.0",
    "@xterm/addon-webgl": "0.19.0",
    "@xterm/addon-search": "0.15.0",
    "@xterm/addon-web-links": "0.11.0",
    "@xterm/addon-unicode11": "0.8.0",
    "@xterm/addon-serialize": "0.13.0",
    "node-pty": "1.2.0-beta.13"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.6.0"
  }
}
```

**Version pinning note:** The `@xterm/addon-*` versions listed above correspond to the last releases compatible with `@xterm/xterm@5.5.0`. All addon minor versions should be verified against the xterm.js 5.5.0 peer dependency before locking. Use `npm info @xterm/addon-fit peerDependencies` to confirm.

### Terminal Initialization Configuration

```typescript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SerializeAddon } from '@xterm/addon-serialize';

const terminal = new Terminal({
  scrollback: 10000,
  fontFamily: '"Cascadia Code", "Fira Code", monospace',
  fontSize: 14,
  theme: { /* match app theme */ },
  cursorStyle: 'bar',
  cursorBlink: true,
  bellStyle: 'none',                    // DockTerm handles notifications separately
  allowProposedApi: true,               // required for some 5.x options
  rescaleOverlappingGlyphs: true,       // Added in 5.5.0; fixes powerline/nerd font overlap
  // ignoreBracketedPasteMode: false,   // keep default
});

const fitAddon = new FitAddon();
const webglAddon = new WebglAddon();
const searchAddon = new SearchAddon();
const unicode11Addon = new Unicode11Addon();
const serializeAddon = new SerializeAddon();

terminal.loadAddon(unicode11Addon);
terminal.unicode.activeVersion = '11';

terminal.loadAddon(fitAddon);
terminal.loadAddon(searchAddon);
terminal.loadAddon(serializeAddon);
terminal.loadAddon(new WebLinksAddon());

// WebGL with DOM fallback
try {
  webglAddon.onContextLoss(() => webglAddon.dispose());
  terminal.loadAddon(webglAddon);
} catch {
  // DOM renderer remains active automatically
}

terminal.open(containerElement);
fitAddon.fit();
```

### PTY Spawn Configuration

```typescript
import * as nodePty from 'node-pty';

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

function getShell(): { exe: string; args: string[] } {
  if (isMac || !isWin) {
    return { exe: process.env.SHELL || '/bin/zsh', args: ['-l'] };
  }
  // Windows
  const pwsh = `${process.env['ProgramFiles']}\\PowerShell\\7\\pwsh.exe`;
  if (require('fs').existsSync(pwsh)) return { exe: pwsh, args: [] };
  const ps5 = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  if (require('fs').existsSync(ps5)) return { exe: ps5, args: [] };
  return { exe: process.env.COMSPEC || 'cmd.exe', args: [] };
}

const { exe, args } = getShell();
const pty = nodePty.spawn(exe, args, {
  name: 'xterm-256color',
  cols: 80,    // updated immediately via FitAddon
  rows: 24,
  cwd: projectRoot,
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: process.env.LANG || 'en_US.UTF-8',
    CLAUDE_CODE_NO_FLICKER: '1',
  },
});
```

### electron-builder / Electron Forge Configuration

```json
// electron-builder
{
  "asarUnpack": [
    "**/node_modules/node-pty/**"
  ],
  "extraResources": [
    { "from": "node_modules/node-pty/build/Release/spawn-helper",
      "to": "app/node_modules/node-pty/build/Release/spawn-helper" }
  ]
}
```

```json
// package.json scripts
{
  "scripts": {
    "postinstall": "electron-rebuild",
    "rebuild": "electron-rebuild"
  }
}
```

### Contributor Setup (Windows)

```powershell
# Verify Visual Studio 2022 has required components
# Required: MSVC v143 C++ x64/x86 build tools
# Required: MSVC v143 VS 2022 C++ x64/x86 Spectre-mitigated libs
# Required: Windows 10/11 SDK

npm install
npx electron-rebuild   # if postinstall hook doesn't trigger
```

### Contributor Setup (macOS)

```bash
xcode-select --install   # if not already installed
npm install              # postinstall runs electron-rebuild automatically
```

---

*End of research document. No application code was created or modified.*
