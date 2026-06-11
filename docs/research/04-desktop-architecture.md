# 04 — Desktop Architecture Research

**DockTerm** | Research date: 2026-06-11 | Author: Desktop Architecture Agent

---

## Findings

### 1. Electron vs Tauri Decision

#### Electron — Current State (mid-2026)

Electron **42.4.0** is the current stable release (released 2026-06-09). It bundles:
- **Node.js 24.16.0**
- **Chromium 148.0.7778.254**

Source: https://releases.electronjs.org/

The 2026 cadence ships a new major every ~8 weeks. Electron 43 beta is available. Electron 40 reached stable in January 2026.

#### Tauri v2 — Current State

Tauri v2.x is production-stable and ships mobile support (iOS/Android). Its architecture:
- WebView2 (Chromium) on Windows, WKWebView (WebKit) on macOS — **not a bundled Chromium**
- Rust backend; frontend remains TypeScript/React
- PTY support: via `tauri-plugin-pty` (wraps `portable-pty` Rust crate, v0.1.1, Aug 2025) or manual `portable_pty` + IPC bridge

Source: https://v2.tauri.app/, https://crates.io/crates/tauri-plugin-pty

#### PTY/Terminal — The Decisive Comparison

**Electron path (node-pty):**
- `node-pty` (Microsoft, npm, updated Dec 2025) runs on Windows natively (no WSL) using ConPTY
- Requires `@electron/rebuild` post-install to recompile against Electron's Node ABI
- VS 2022 VC++ (present on this machine) is the required toolchain on Windows — confirmed compatible
- node-pty lives entirely in the **main process**; renderer gets streamed bytes over contextBridge
- ASAR: must be excluded; electron-builder auto-detects `.node` files but `spawn-helper` and other executables need explicit `asarUnpack` glob
- xterm.js 6.0.0 (Jun 2026) runs in renderer — standard HTML5 canvas/WebGL2, works identically in Electron

**Tauri path (portable-pty):**
- `tauri-plugin-pty` v0.1.1 (Aug 2025) wraps portable-pty 0.9 in Rust
- You write PTY lifecycle (spawn, resize, kill) in Rust; IPC bridge sends data to xterm.js via Tauri's `invoke`/`event.listen` API
- On Windows, portable-pty uses ConPTY just as node-pty does — same underlying OS API
- Monaco editor runs in WKWebView on macOS: **known compatibility issues** (an open GitHub bug tracker repo `xuchaoqian/tauri-monaco-demo` documents Monaco/WKWebView rendering glitches that do not occur in Chromium/WebView2)
- WebView divergence risk: Monaco and xterm.js are tested primarily against V8/Chromium; WKWebView uses JavaScriptCore (different JIT, different CSS engine)

#### Binary Size / Memory

| | Electron 42 | Tauri v2 |
|---|---|---|
| Packaged size (typical) | ~180-220 MB | ~8-15 MB |
| RAM at idle | ~150-200 MB | ~40-70 MB |
| Startup | ~1-2 s | ~0.3-0.5 s |

Source: https://tech-insider.org/tauri-vs-electron-2026/, https://rustify.rs/articles/rust-tauri-vs-electron-2026

For a developer tool running alongside IDE, browser, and compiler on a dev machine, the Electron memory overhead is acceptable. The app is not distributed to end-users with resource constraints.

#### Team Velocity Cost of Tauri (V1 estimate)

DockTerm is TypeScript-only today. Tauri adds:
1. Rust toolchain setup + learning curve (estimated 1-2 sprint weeks for a TypeScript-only team)
2. PTY logic reimplemented in Rust (vs copying node-pty examples — 1-2 days vs 1-2 weeks)
3. Every main-process feature (fs operations, git, MCP config readers, chokidar-equivalent) duplicated as a Tauri command in Rust
4. Monaco + WKWebView compatibility debugging (unknown, potentially significant for macOS)
5. No existing Tauri+Monaco+xterm.js reference app beyond toy demos

**Estimated additional V1 cost: 4-8 sprint weeks** of Rust implementation and debugging for a TypeScript team.

#### Verdict: Electron Confirmed

The user default of Electron is correct. For DockTerm specifically:
- node-pty is mature, Windows-native, VS 2022 compatible, no Rust required
- Monaco editor is a first-class Chromium citizen
- The entire service layer (fs, git, pty, watcher) stays in TypeScript/Node.js
- Binary size is irrelevant for a developer tool (not distributed via app stores)
- Tauri would cost 4-8 weeks of additional V1 time with non-trivial macOS rendering risk

---

### 2. Electron Specifics

#### Version to Pin

Pin **Electron 42** (`^42.4.0`) — the current stable (2026-06-09).
- Node 24.16.0 bundled — matches dev machine Node v24.15.0 closely (within patch)
- Chromium 148 — full WebGL2, modern CSS, ES2024 features
- Do **not** chase Electron 43 beta for V1

#### Scaffolding: electron-vite vs Electron Forge + @electron-forge/plugin-vite

**electron-vite v5.0.0** (published ~Jan 2026, 5 months ago as of search date):
- Latest major: v5.0.0 — introduced `build.isolatedEntries`, `build.externalizeDeps` (enabled by default, replaces the old `externalizeDepsPlugin`)
- Opinionated project layout: `src/main/`, `src/preload/`, `src/renderer/` — exactly what DockTerm needs
- HMR in renderer, hot-reload in main and preload processes
- `build.externalizeDeps: true` by default — native modules like node-pty are automatically externalized from Vite bundle (not bundled, loaded at runtime by Node) — critical for node-pty
- Pairs with **electron-builder** for packaging
- Community-driven; healthy GitHub activity

**Electron Forge 7.11.2** + `@electron-forge/plugin-vite`:
- Official Electron team toolchain
- Vite plugin is **still marked experimental** as of Forge v7.5.0+ (confirmed in search results)
- Forge handles dev/build/package in one tool but with more opinion and less flexibility
- Auto Unpack Natives plugin handles node-pty ASAR extraction
- Packaging uses Forge's Makers (Squirrel, ZIP, DMG) — less flexible than electron-builder for NSIS config

**Recommendation: electron-vite v5 + electron-builder v26**

Rationale:
- Forge's Vite plugin remains experimental; not appropriate for a greenfield app in 2026
- electron-vite gives cleaner main/preload/renderer separation out of the box
- `build.externalizeDeps` handles node-pty correctly without extra config
- electron-builder v26.15.2 (latest as of 2026-06-10) is the most flexible packager with better NSIS support, asarUnpack auto-detection, and richer Windows target options

Source: https://electron-vite.org/, https://www.electronforge.io/config/plugins/vite

---

### 3. Process Model Design

#### Responsibility Map

```
┌─────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS (Node.js 24, full access)                         │
│                                                                  │
│  PtyService        — node-pty spawn/resize/kill/stream          │
│  FsService         — fs.promises read/write/mkdir               │
│  GitService        — simple-git 3.36.0 wrapper                  │
│  WatcherService    — chokidar 4.x watcher (ESM compat)          │
│  ConfigService     — MCP JSON / skills file readers             │
│  StoreService      — atomic JSON config (userData)              │
│  IpcRouter         — validates + dispatches all IPC             │
│                                                                  │
│  app, BrowserWindow, protocol registration                       │
└───────────────────┬─────────────────────────────────────────────┘
                    │ contextBridge (sandbox:true)
┌───────────────────▼─────────────────────────────────────────────┐
│  PRELOAD SCRIPT (src/preload/index.ts)                          │
│                                                                  │
│  Exposes window.dockterm = {                                     │
│    pty: { spawn, resize, kill, onData, onExit },                │
│    fs:  { readFile, writeFile, listDir },                       │
│    git: { status, log, diff, stage, commit, branches },         │
│    watch: { onFsChange },                                       │
│    config: { getMcp, getSkills, getAppConfig, setAppConfig },   │
│    shell: { openExternal, getPath }                             │
│  }                                                               │
│                                                                  │
│  Implements: ipcRenderer.invoke for request/response            │
│              ipcRenderer.on for server-push streams             │
└───────────────────┬─────────────────────────────────────────────┘
                    │ window.dockterm API
┌───────────────────▼─────────────────────────────────────────────┐
│  RENDERER PROCESS (Vite + React 19 + TypeScript)                │
│                                                                  │
│  TerminalPane  — xterm.js 6.0.0 + WebGL addon                  │
│  EditorPane    — Monaco editor                                   │
│  FileTree      — file tree using watcher events                 │
│  GitPanel      — git status/diff/commit UI                      │
│  ConfigPanel   — MCP config inspector / skills viewer           │
│  StateLayer    — zustand 5.0.14 stores                          │
└─────────────────────────────────────────────────────────────────┘
```

#### Typed IPC Pattern

**Channel definitions in `src/shared/ipc.ts`:**

```typescript
// src/shared/ipc.ts — single source of truth for ALL IPC
export interface IpcChannels {
  // Request/response (ipcRenderer.invoke <-> ipcMain.handle)
  'pty:spawn':     { req: PtySpawnOptions;  res: { pid: number }        }
  'pty:resize':    { req: { pid: number; cols: number; rows: number }; res: void }
  'pty:kill':      { req: { pid: number }; res: void                   }
  'fs:readFile':   { req: { path: string }; res: { content: string }   }
  'fs:writeFile':  { req: { path: string; content: string }; res: void }
  'fs:listDir':    { req: { path: string }; res: DirEntry[]            }
  'git:status':    { req: { cwd: string }; res: GitStatus              }
  'git:stage':     { req: { cwd: string; files: string[] }; res: void  }
  'git:commit':    { req: { cwd: string; message: string }; res: void  }
  'config:getMcp': { req: void; res: McpConfig                         }
  // Push channels (ipcMain.webContents.send -> ipcRenderer.on)
  'pty:data':      { payload: { pid: number; data: string }            }
  'pty:exit':      { payload: { pid: number; code: number }            }
  'watch:change':  { payload: FsChangeEvent                            }
  'git:statusPush':{ payload: { cwd: string; status: GitStatus }       }
}
```

**Typed wrappers:**

```typescript
// Renderer side — fully inferred from IpcChannels
export const ipc = {
  invoke<K extends InvokeChannels>(ch: K, req: IpcChannels[K]['req'])
    : Promise<IpcChannels[K]['res']> {
    return window.dockterm.__invoke(ch, req)
  },
  on<K extends PushChannels>(ch: K, cb: (payload: IpcChannels[K]['payload']) => void)
    : () => void { /* returns unsubscribe */ }
}
```

**Runtime validation at the main-process boundary:**

Use **Zod** for boundary validation. Rationale:
- Zod 3 is the ecosystem standard (used by tRPC, React Hook Form, etc.)
- Provides both TypeScript type inference and runtime guards from a single schema
- Schemas live in `src/shared/schemas.ts`, referenced by both `ipc.ts` (for types) and `IpcRouter` (for validation)
- Alternative (hand-rolled guards) is feasible but adds boilerplate maintenance burden; not recommended

```typescript
// src/main/ipc-router.ts
ipcMain.handle('pty:spawn', async (_event, raw) => {
  const req = PtySpawnOptionsSchema.parse(raw) // throws ZodError → caught, returns error
  return ptyService.spawn(req)
})
```

**contextBridge shape — single namespace:**

```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('dockterm', {
  __invoke: (channel: string, req: unknown) => ipcRenderer.invoke(channel, req),
  __on: (channel: string, cb: Function) => {
    const handler = (_: unknown, payload: unknown) => cb(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
// types declared in src/shared/window.d.ts for renderer TS
```

---

### 4. webPreferences / Security

#### Recommended Flags

```typescript
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,   // default since Electron 12; KEEP
    nodeIntegration: false,   // default since Electron 5; KEEP
    sandbox: true,            // default since Electron 20; KEEP
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: true,
    allowRunningInsecureContent: false,
  }
})
```

#### sandbox:true Compatibility with contextBridge

Confirmed: `contextBridge` is available in sandboxed preload scripts. Electron explicitly lists it among the modules accessible within a sandboxed preload. The preload can import `contextBridge` and `ipcRenderer` from `electron` and use them normally.

**Limitations under sandbox:true:**
- Preload cannot `require()` arbitrary Node.js modules — only `electron`, `events`, `timers`, `url`
- No native modules in preload — this is correct: node-pty lives in main, never preload
- Cannot use `__dirname`/`__filename` directly in preload under sandbox (use `import.meta.url` or let electron-vite inject path constants at build time)
- Cannot split preload into multiple files via CommonJS `require` — use a bundler (electron-vite handles this)

**Consequence for DockTerm:** node-pty runs in main process, all IPC goes through contextBridge — fully compatible with `sandbox:true`. No exceptions needed.

Source: https://www.electronjs.org/docs/latest/tutorial/sandbox

#### Loading Strategy

| Mode | Approach |
|------|----------|
| Development | `win.loadURL('http://localhost:5173')` — Vite dev server; electron-vite auto-injects the URL via `MAIN_WINDOW_VITE_DEV_SERVER_URL` env var |
| Production | Register a custom `app://` protocol handler; `win.loadURL('app://./index.html')` |

**Why custom protocol over `loadFile`:**
- `file://` URIs lack proper MIME types — Electron refuses ES modules from `file://`
- CSP cannot be delivered via HTTP headers over `file://` — must use `<meta>` tag only
- Custom protocol (`app://`) is served with correct MIME types and supports proper CSP headers
- Aligns with Electron security best practices documented in 2025 sources

Source: https://blog.bloomca.me/2025/07/20/electron-apps-custom-protocols.html, https://www.electronjs.org/docs/latest/api/protocol

#### CSP Approach

**Development (Vite dev server):**
```
Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval' ws://localhost:5173; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:5173
```
`unsafe-eval` required in dev for Vite HMR and source maps. Never in prod.

**Production (custom protocol, set via `session.defaultSession.webRequest.onHeadersReceived`):**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'
```
`unsafe-inline` for styles is acceptable (Monaco injects dynamic styles); tighten with nonces if needed in future.

---

### 5. Packaging & Distribution

#### Tool: electron-builder v26.15.2

Chosen over Electron Forge for packaging because:
- Forge's NSIS/packaging makers are less configurable than electron-builder
- electron-builder has native NSIS support, portable target, asarUnpack auto-detection
- Pairs naturally with electron-vite

Source: https://www.electron.build/

#### Windows Targets

```yaml
# electron-builder.yml (excerpt)
win:
  target:
    - target: nsis        # default installer (recommended)
    - target: portable    # single-exe option, no install required
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
```

- NSIS installer is the standard Windows distribution format; produces a single `DockTerm-Setup-x.y.z.exe`
- Portable target is useful for V1 dev distribution — no admin rights required to run
- Windows codesigning: **not required for V1** — unsigned EXE will trigger SmartScreen on first run (user clicks "More info → Run anyway"); acceptable for internal dev tool distribution. Add EV cert in V1.1+.

#### node-pty ASAR Handling

```yaml
# electron-builder.yml
asarUnpack:
  - "**/*.node"
  - "**/node_modules/node-pty/**"
```

electron-builder auto-detects `.node` files, but `node-pty` ships `spawn-helper` (binary executable) that is not a `.node` file. Explicitly unpacking the entire `node-pty` folder avoids the known issue where only `.node` files are detected but helper executables are missed.

Source: https://github.com/electron-userland/electron-builder/issues/8020

#### macOS Distribution

macOS notarization requires:
1. Apple Developer Account ($99/yr)
2. Developer ID Application certificate
3. `xcrun notarytool` (Xcode CLT; `altool` fully deprecated Nov 2023)
4. macOS hardware (or GitHub Actions macOS runner) — **cannot sign/notarize from Windows**

**V1 options for macOS:**
- **Option A (recommended):** Distribute unsigned `.dmg` to teammates/developers only. They right-click → Open to bypass Gatekeeper. Acceptable for an internal/open-source dev tool in early release.
- **Option B:** Use GitHub Actions `macos-latest` runner to build, sign, and notarize automatically. Requires secrets (Apple ID / App Store Connect API key). Best practice for public releases.
- Auto-update is explicitly **out of V1 scope** — omit `publish` config entirely.

Source: https://www.forasoft.com/blog/article/the-pain-of-publishing-electron-apps-on-macos-303, https://www.electronjs.org/docs/latest/tutorial/code-signing

#### App Icons

- Windows: `build/icon.ico` (multi-resolution ICO, 16/32/48/64/128/256px)
- macOS: `build/icon.icns`
- Use a 1024×1024 PNG as source; generate ICO/ICNS with `electron-icon-maker` or `png2icons`

---

### 6. Config / Storage

#### electron-store — Current Status

`electron-store` v11.0.2 (released Oct 2025) is **native ESM only**; no CommonJS export. Requires **Electron 30+** (we use Electron 42 — compatible). The library reads/writes the entire JSON file on every change and is explicitly described as "not a database."

Source: https://github.com/sindresorhus/electron-store

#### Recommendation: Hand-Rolled Atomic JSON Store

For DockTerm V1, implement a minimal atomic JSON store in `src/main/store.ts`. Rationale:

1. **Atomic writes:** write to `config.tmp`, then `fs.rename()` to `config.json` — single syscall, crash-safe
2. **Zero dependency:** avoids the ESM-only constraint and reduces supply chain risk
3. **Fully typed:** `StoreService<T>` generic with Zod schema for validation on read
4. **~40 lines of code** — not worth a dependency for this use case

```typescript
// src/main/store.ts — sketch
export class Store<T extends z.ZodTypeAny> {
  private schema: T
  private filePath: string
  constructor(name: string, schema: T, defaults: z.infer<T>) { ... }
  async get(): Promise<z.infer<T>> { ... }
  async set(data: z.infer<T>): Promise<void> {
    const tmp = this.filePath + '.tmp'
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tmp, this.filePath) // atomic on same-partition
  }
}
// Usage:
const store = new Store('app-config', AppConfigSchema, defaultConfig)
// Stored at: app.getPath('userData')/app-config.json
```

`app.getPath('userData')` returns:
- Windows: `C:\Users\<name>\AppData\Roaming\DockTerm\`
- macOS: `~/Library/Application Support/DockTerm/`

If electron-store's features (encryption, migrations, watches) become useful later, upgrade in V1.1.

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| node-pty rebuild fails on new Electron major | Medium | Pin Electron version; run `@electron/rebuild` in postinstall; CI tests on push |
| node-pty asarUnpack misses `spawn-helper` | Medium | Explicit `asarUnpack: ["**/node_modules/node-pty/**"]` in electron-builder config |
| Electron 42→43 break during dev | Low | Pin `"electron": "42.4.x"` (patch only); upgrade deliberately |
| Monaco editor CSP `unsafe-eval` requirement | Medium | Monaco requires `unsafe-eval` in production CSP for its JIT; use `session.webRequest.onHeadersReceived` to set CSP only on app:// protocol, not on any external frames |
| WKWebView divergence (future macOS parity) | Low | Electron uses WebView2 on Windows and Chromium everywhere (not WKWebView) — N/A for Electron; would only matter if switching to Tauri |
| chokidar v5 ESM-only in main process | Low | Main process uses ES modules (electron-vite supports ESM main); chokidar 4.x supports both CJS+ESM; use v4 if ESM main is not confirmed |
| electron-store ESM-only breaking existing CJS | Low | Using hand-rolled store avoids entirely |
| macOS notarization blocks V1 macOS builds | Low | V1 ships Windows installer; macOS is unsigned DMG via CI with explicit Gatekeeper bypass docs |
| sandbox:true breaks preload helpers | Low | All Node work stays in main; preload is pure IPC bridge; verified compatible |

---

## Decisions (Recommended)

1. **Framework:** Electron 42 (confirmed; Tauri rejected for V1)
2. **Scaffolding:** electron-vite v5 (not Forge's experimental Vite plugin)
3. **Packager:** electron-builder v26
4. **IPC Pattern:** Typed channel map in `src/shared/ipc.ts`; `ipcRenderer.invoke` for request/response; `ipcRenderer.on` for streams; Zod validation at main-process boundary
5. **Security:** `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true` — all defaults; no exceptions
6. **Preload shape:** Single `window.dockterm` namespace via contextBridge
7. **Loading:** dev → Vite dev server URL; prod → custom `app://` protocol
8. **Config storage:** Hand-rolled atomic JSON store (not electron-store)
9. **Windows packaging:** NSIS installer + portable target; no code signing in V1
10. **macOS packaging:** Unsigned DMG via GitHub Actions macOS runner; V1 ships Windows first

---

## Rejected Ideas

| Idea | Reason Rejected |
|------|----------------|
| Tauri v2 for DockTerm | 4-8 sprint weeks of Rust overhead; Monaco/WKWebView compat risk; no TypeScript-native PTY; team has no Rust experience |
| Electron Forge + `@electron-forge/plugin-vite` | Vite plugin marked experimental in Forge 7.x; less NSIS control; less flexible than electron-vite + electron-builder split |
| `nodeIntegration:true` for simplicity | Security anti-pattern; Electron's own docs and default reject it since v5; contextBridge pattern works fine |
| `loadFile` for production | `file://` protocol blocks ES modules, prevents proper CSP headers; custom `app://` protocol is the correct 2026 approach |
| electron-store v11 | ESM-only dependency for ~40 lines of functionality; atomic store is trivial to implement and eliminates the dependency |
| xterm.js 5.x | 6.0.0 (Jun 2026) is current stable; use latest |
| chokidar v5 for file watching | v5 is ESM-only (Nov 2025); while ESM main is fine with electron-vite, v4 retains CJS/ESM dual support — safer for V1; revisit in V1.1 |
| Auto-update in V1 | Scope cut; requires macOS notarization, Windows signing, update server; none are V1 requirements |
| Multiple BrowserWindows in V1 | Unnecessary complexity; single window with split pane layout covers all V1 UX |

---

## V1 Recommendations — Final Stack

### Exact Versions

| Package | Version | Role |
|---------|---------|------|
| `electron` | `42.4.0` | App shell; Node 24.16.0, Chromium 148 |
| `electron-vite` | `5.0.0` | Dev tooling; main/preload/renderer builds + HMR |
| `electron-builder` | `26.15.2` | Packaging; NSIS + portable Windows; DMG macOS |
| `@electron/rebuild` | `latest` | Rebuilds node-pty against Electron's Node ABI |
| `react` | `19.x` | Renderer UI framework |
| `typescript` | `5.x` | Type safety throughout |
| `vite` | `6.x` | Renderer bundler (electron-vite dependency) |
| `node-pty` | `latest` (Dec 2025+) | PTY spawning; main process only |
| `xterm.js (@xterm/xterm)` | `6.0.0` | Terminal renderer; renderer process |
| `@xterm/addon-webgl` | `0.19.0` | WebGL2 renderer for xterm.js |
| `@xterm/addon-fit` | `latest` | Terminal resize fitting |
| `monaco-editor` | `latest` | Code editor; renderer process |
| `simple-git` | `3.36.0` | Git operations; main process |
| `chokidar` | `4.x` | File watching; main process (v4 = CJS+ESM) |
| `zustand` | `5.0.14` | Renderer state management |
| `zod` | `3.x` | IPC boundary schema validation; shared |

### Process Architecture Diagram (ASCII)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  MAIN PROCESS — Node.js 24.16.0 (full privileges)                          ║
║                                                                              ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ║
║  │  PtyService  │  │  FsService   │  │  GitService  │  │ WatchService │   ║
║  │  (node-pty)  │  │ (fs.promises)│  │ (simple-git) │  │ (chokidar 4) │   ║
║  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   ║
║         │                 │                  │                  │            ║
║  ┌──────▼─────────────────▼──────────────────▼──────────────────▼───────┐   ║
║  │                    IpcRouter (src/main/ipc-router.ts)                 │   ║
║  │           Zod validation on every incoming ipcMain.handle()          │   ║
║  └──────────────────────────────┬────────────────────────────────────────┘   ║
║                                 │  ipcMain.handle / webContents.send        ║
║  ┌──────────────┐               │                                            ║
║  │ ConfigService│               │  src/shared/ipc.ts — IpcChannels type     ║
║  │ (MCP/skills) │               │  src/shared/schemas.ts — Zod schemas      ║
║  └──────────────┘               │  src/shared/window.d.ts — window.dockterm ║
║  ┌──────────────┐               │                                            ║
║  │  Store       │               │                                            ║
║  │ (atomic JSON)│               │                                            ║
║  └──────────────┘               │                                            ║
╚════════════════════════════════╪═════════════════════════════════════════════╝
                                  │
              ╔═══════════════════╪══════════════════════╗
              ║  PRELOAD (sandbox:true, contextBridge)    ║
              ║                                           ║
              ║  window.dockterm = {                      ║
              ║    pty:    { spawn, resize, kill,         ║
              ║              onData, onExit }             ║
              ║    fs:     { readFile, writeFile,         ║
              ║              listDir }                    ║
              ║    git:    { status, log, diff,           ║
              ║              stage, commit, branches }    ║
              ║    watch:  { onFsChange }                 ║
              ║    config: { getMcp, getSkills,           ║
              ║              getAppConfig,                ║
              ║              setAppConfig }               ║
              ║    shell:  { openExternal, getPath }      ║
              ║  }                                        ║
              ║                                           ║
              ║  invoke()  → ipcRenderer.invoke()         ║
              ║  on()      → ipcRenderer.on()             ║
              ╚═══════════════════╪══════════════════════╝
                                  │  window.dockterm API (typed)
              ╔═══════════════════╪══════════════════════╗
              ║  RENDERER — Vite + React 19 + TypeScript  ║
              ║  (Chromium 148, sandbox:true)             ║
              ║                                           ║
              ║  ┌─────────────┐   ┌────────────────┐    ║
              ║  │TerminalPane │   │   EditorPane   │    ║
              ║  │ xterm.js 6  │   │     Monaco     │    ║
              ║  │ WebGL addon │   │                │    ║
              ║  └─────────────┘   └────────────────┘    ║
              ║  ┌─────────────┐   ┌────────────────┐    ║
              ║  │  FileTree   │   │   GitPanel     │    ║
              ║  │(watch events│   │ (status/diff/  │    ║
              ║  │  + fs calls)│   │  commit UI)    │    ║
              ║  └─────────────┘   └────────────────┘    ║
              ║  ┌────────────────────────────────────┐   ║
              ║  │         ConfigPanel                │   ║
              ║  │  (MCP JSON / skills viewer)        │   ║
              ║  └────────────────────────────────────┘   ║
              ║                                           ║
              ║  Zustand 5 stores: terminalStore,         ║
              ║  fileTreeStore, gitStore, configStore     ║
              ╚═══════════════════════════════════════════╝

  Loading:
    DEV:   win.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL)
    PROD:  registerFileProtocol('app', ...) → win.loadURL('app://./index.html')

  Packaging (Windows, dev machine):
    npm run build → electron-vite build
    npm run dist  → electron-builder --win nsis portable
    Output: dist/DockTerm Setup 1.0.0.exe  (NSIS)
            dist/DockTerm 1.0.0.exe        (portable)
```

### Key Implementation Sequence

1. `npm create @quick-start/electron@latest dockterm -- --template react-ts` — electron-vite scaffold
2. Pin `electron@42.4.0`, add `node-pty`, `@electron/rebuild` as devDep postinstall hook
3. Configure `electron-builder.yml`: `asarUnpack: ["**/*.node", "**/node_modules/node-pty/**"]`
4. Wire `src/shared/ipc.ts` channel definitions and Zod schemas before writing any service
5. Implement `PtyService` + IPC channels first (terminal is hero feature)
6. Add `contextBridge` preload, verify sandbox:true passes all service calls
7. Implement `app://` protocol registration for production builds
8. Add `FsService`, `WatchService`, `GitService`, `ConfigService` in order
9. Wire renderer panes to `window.dockterm` API
10. Add electron-builder config; test `npm run dist` on Windows dev machine

---

*Sources cited inline. All versions verified via npm registry and official release pages as of 2026-06-11.*
