# 08 — DockTerm Security Research

**Date:** 2026-06-11  
**Author:** Security Agent (planning phase)  
**Status:** Planning — no app code exists yet

---

## Findings

### 1. Electron Hardening Checklist (Current, Cited)

Source: [Electron Security Docs](https://www.electronjs.org/docs/latest/tutorial/security) — 20-item checklist, verified June 2026.

#### BrowserWindow / WebPreferences

| Setting | Required value | Notes |
|---|---|---|
| `contextIsolation` | `true` | Default since Electron 12. Runs preload in separate JS context from renderer. DO NOT disable. |
| `nodeIntegration` | `false` | Default since Electron 5. Disabling also required for sandbox to function. |
| `sandbox` | `true` | Default since Electron 20. Must be explicit in config to signal intent. Restricts renderer to CPU+memory only. |
| `webSecurity` | `true` (do not set false) | Enforces same-origin; disabling breaks CORS protections. |
| `allowRunningInsecureContent` | `false` (default) | Never override. |
| `webviewTag` | `false` | DockTerm uses no `<webview>`. Disable explicitly. |
| `nodeIntegrationInSubFrames` | `false` | No sub-frames ever need Node access. |
| `enableRemoteModule` | `false` | `remote` module is deprecated and removed in modern Electron; ensure no polyfill reintroduces it. |
| `experimentalFeatures` | `false` | Leave off. |

#### Navigation Controls

```typescript
// Block all navigation — DockTerm loads only local content
contents.on('will-navigate', (event, _url) => {
  event.preventDefault();
});

// Deny all new window requests
contents.setWindowOpenHandler(() => ({ action: 'deny' }));
```

Rationale: DockTerm never needs the renderer to navigate anywhere. Any navigation attempt is an attack signal.

#### Permission Handler (deny-all)

```typescript
session.defaultSession.setPermissionRequestHandler(
  (_webContents, _permission, callback) => callback(false)
);
```

DockTerm has no legitimate need for camera, microphone, geolocation, notifications, or any other browser-level permission.

#### Protocol: `app://` in production, `vite://` / `localhost` in dev

- **DO NOT** use `file://` to serve app content. The `grantFileProtocolExtraPrivileges` fuse (enabled by default) grants `file://` pages elevated access beyond what browsers allow. See [Electron Fuses](https://www.electronjs.org/docs/latest/tutorial/fuses).
- **DO** register a custom `app://` protocol in production using `protocol.handle()` (Electron 25+) or `protocol.registerBufferProtocol()`. Serve only files from inside the ASAR bundle. Apply path normalization and a whitelist of allowed extensions.
- In dev, Vite's `localhost:5173` origin is loaded via `loadURL`. Confine CSP to allow only `localhost` script origins in dev mode. Flip to `'self'` in production.

#### Content Security Policy

Two distinct CSPs are required:

**Development CSP (Vite HMR active):**
```
default-src 'none';
script-src 'self' 'unsafe-eval' http://localhost:5173 ws://localhost:5173;
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self' ws://localhost:5173 http://localhost:5173;
worker-src blob:;
```

`'unsafe-eval'` is required by Vite HMR in dev only. Remove entirely in production. `worker-src blob:` is required for Monaco Editor (language workers) and xterm.js (addon workers) which construct workers from blob URLs — confirmed by Monaco's architecture docs and community reports.

**Production CSP:**
```
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
worker-src blob:;
```

`'unsafe-inline'` on `style-src` is required by Monaco's dynamic theming. `worker-src blob:` remains required in production for Monaco and xterm.js workers. Accept this — both are well-known open-source libraries with no remote fetch from their workers.

Deliver CSP as `<meta http-equiv="Content-Security-Policy">` in the HTML shell (since file:// and custom protocols cannot set HTTP headers the way a web server can).

#### @electron/fuses — Recommended Production Settings

Source: [Electron Fuses](https://www.electronjs.org/docs/latest/tutorial/fuses), [electron-builder fuse integration](https://www.electron.build/tutorials/adding-electron-fuses.html)

| Fuse | Default | Recommended | Reason |
|---|---|---|---|
| `RunAsNode` | ON | **OFF** | Prevents `ELECTRON_RUN_AS_NODE` env var from turning the binary into a Node.js runner. node-pty is in the main process, not a child node process, so this is safe. |
| `NodeOptions` | ON | **OFF** | Prevents `NODE_OPTIONS` / `NODE_EXTRA_CA_CERTS` env var injection in production. |
| `NodeCliInspect` | ON | **OFF** | Prevents `--inspect` debugger attachment to production binary. |
| `EmbeddedAsarIntegrityValidation` | OFF | **ON** | Validates ASAR hash at load time. Pair with `OnlyLoadAppFromAsar`. |
| `OnlyLoadAppFromAsar` | OFF | **ON** | Prevents loading app code outside the signed ASAR. |
| `CookieEncryption` | OFF | **ON** | DockTerm stores no cookies, but encrypting the Chromium cookie store at rest costs nothing and prevents offline extraction. |
| `GrantFileProtocolExtraPrivileges` | ON | **OFF** | DockTerm uses `app://` in production, not `file://`. Disable extra file:// privileges. |

ASAR integrity caveat: CVE-2024-46992 demonstrated a Windows-specific bypass of ASAR integrity when `embeddedAsarIntegrityValidation` and `onlyLoadAppFromAsar` are both enabled. Monitor Electron releases. Combined with code signing, ASAR integrity remains the correct posture — just stay current on Electron versions.

#### electron-builder Configuration (afterSign hook pattern)

```javascript
// electron-builder.config.js (afterSign)
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context;
  // path to the Electron binary
  const ext = { darwin: '.app', win32: '.exe', linux: '' }[electronPlatformName] ?? '';
  const electronBinaryPath = /* compute path */;

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });
};
```

---

### 2. IPC Attack Surface — Design Rules

Source: [Electron Security — IPC validation](https://www.electronjs.org/docs/latest/tutorial/security), [IpcMainEvent](https://www.electronjs.org/docs/latest/api/structures/ipc-main-event), [Bishop Fox Electron guide](https://bishopfox.com/blog/reasonably-secure-electron)

#### Principle: One channel per verb, never generic dispatch

**REJECTED pattern (never do this):**
```typescript
// BAD: generic fs dispatcher
ipcMain.handle('fs:call', (event, { method, args }) => {
  return fs[method](...args); // renderer controls method name = arbitrary fs access
});
```

**REQUIRED pattern:**
```typescript
// GOOD: one handler per operation
ipcMain.handle('fs:readFile', (event, payload) => { /* narrow, validated */ });
ipcMain.handle('fs:writeFile', (event, payload) => { /* narrow, validated */ });
ipcMain.handle('git:status', (event, payload) => { /* narrow, validated */ });
```

#### Runtime payload validation with Zod

Every IPC handler must validate its payload before touching any system resource:

```typescript
import { z } from 'zod';

const ReadFilePayload = z.object({
  relativePath: z.string().max(4096).regex(/^[^<>:"|?*\x00-\x1f]+$/),
});

ipcMain.handle('fs:readFile', async (event, raw) => {
  validateSender(event); // see sender validation below
  const { relativePath } = ReadFilePayload.parse(raw); // throws ZodError on bad input
  return fsService.readFile(relativePath); // jail enforced inside fsService
});
```

Use `z.safeParse()` when you want to return a structured error rather than throw. Size limits on strings prevent memory exhaustion from oversized payloads.

#### Sender validation

```typescript
function validateSender(event: Electron.IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (!frame) throw new Error('IPC rejected: frame destroyed');
  const url = frame.url;
  // In production: only app:// origin
  // In dev: only localhost:5173
  const allowed = app.isPackaged
    ? url.startsWith('app://')
    : url.startsWith('http://localhost:5173');
  if (!allowed) throw new Error(`IPC rejected: untrusted origin ${url}`);
}
```

Note: `senderFrame` can be null if the frame navigates or is destroyed mid-IPC (Electron added `WebFrameMain.detached` in late 2024 to help detect this). The validation above rejects null frames.

#### Error responses — no raw stacks with paths

Never return raw `Error` objects or stack traces to the renderer. Stack traces contain absolute file paths and may reveal installation layout. Return structured error codes:

```typescript
// In IPC handler catch blocks:
return { ok: false, code: 'FS_READ_ERROR', message: 'Could not read file' };
// NOT: return { ok: false, error: err.stack }
```

#### Rate limiting for V1

No per-channel rate limiting in V1. Justification: DockTerm loads no remote content and the renderer is fully trusted local code. All legitimate user actions (typing, clicking) are low-frequency. Revisit if a plugin/extension system is added in a future version.

---

### 3. Filesystem Jail — Concrete Algorithm

#### Core invariant

Every filesystem operation must resolve to a path that starts with the opened project root (after full resolution), OR is one of two explicitly scoped exceptions.

#### Algorithm (pseudo-code, Windows + macOS)

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';

const projectRoot: string; // set once when user opens folder, stored in main process

async function resolveAndValidate(
  inputPath: string,
  capability: 'project' | 'claude-config-readonly' | 'app-userdata'
): Promise<string> {
  // Step 1: Resolve relative path against the appropriate base
  const base = capability === 'project' ? projectRoot
    : capability === 'claude-config-readonly' ? os.homedir()
    : app.getPath('userData');

  const joined = path.resolve(base, inputPath);

  // Step 2: Resolve symlinks — CRITICAL to prevent symlink escape
  // realpath() throws ENOENT for non-existent paths; handle accordingly
  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch {
    // For writes to new files: resolve the parent, then re-append the filename
    const parentReal = await fs.realpath(path.dirname(joined));
    real = path.join(parentReal, path.basename(joined));
  }

  // Step 3: Determine allowed root for this capability
  const allowedRoot = capability === 'project' ? await fs.realpath(projectRoot)
    : capability === 'claude-config-readonly' ? await fs.realpath(os.homedir())
    : await fs.realpath(app.getPath('userData'));

  // Step 4: Case-insensitive prefix check on Windows
  const normalizedReal = process.platform === 'win32'
    ? real.toLowerCase()
    : real;
  const normalizedAllowed = process.platform === 'win32'
    ? allowedRoot.toLowerCase()
    : allowedRoot;

  if (!normalizedReal.startsWith(normalizedAllowed + path.sep) &&
      normalizedReal !== normalizedAllowed) {
    throw new JailEscapeError(`Path ${real} is outside ${allowedRoot}`);
  }

  // Step 5: Windows-specific UNC / drive letter normalization
  // path.resolve() on Windows already normalizes drive letters to uppercase.
  // UNC paths (\\server\share\...) must be detected and rejected unless
  // the project root itself is a UNC path:
  if (process.platform === 'win32' && real.startsWith('\\\\')) {
    if (!projectRoot.startsWith('\\\\')) {
      throw new JailEscapeError('UNC path not permitted for local project');
    }
  }

  return real;
}
```

#### The two sanctioned exceptions (explicit capabilities, not jail-widening)

These are **not** handled by widening the project jail. They are separate service instances with separate permission checks:

1. **`claude-config-readonly` capability**: Read-only access to `~/.claude.json` and `~/.claude/` tree. Only activated when user explicitly opts in via settings toggle. Enforced: open only specific known files (e.g., `~/.claude.json`, `~/.claude/settings.json`, `~/.claude/mcp.json`), never the entire home directory. No write path exists. Symlinks within `~/.claude/` are resolved before read; if they escape `~/.claude/`, reject.

2. **`app-userdata` capability**: Read/write access to `app.getPath('userData')` (e.g., `~/Library/Application Support/DockTerm` on macOS, `%APPDATA%\DockTerm` on Windows). Only DockTerm's own preferences, window state, and recents are stored here. Claude tokens are **never** written here.

#### Rejecting writes outside project root

The IPC handler layer distinguishes read operations from write/delete operations. Write operations only proceed if `resolveAndValidate` succeeds with `capability === 'project'` and the path is inside the project root. The `claude-config-readonly` capability has no write IPC handlers whatsoever.

---

### 4. PTY Trust Model

#### Honest statement of trust

A terminal emulator executes whatever the user types. DockTerm adds **no privilege** beyond any other terminal app. The user owns their shell. DockTerm's security responsibility for the PTY is narrow but important.

#### Controls DockTerm must implement

**(a) Only local renderer may drive PTY IPC**

The PTY IPC channels (`pty:write`, `pty:resize`, `pty:spawn`) must pass sender validation (see Section 2). Since DockTerm never loads remote content, there is no remote frame to exploit this, but the validation must be in place so that any future code path that loads external content cannot accidentally access PTY channels.

**(b) Commands DockTerm constructs must never use shell interpolation**

When DockTerm runs git operations or package.json scripts on behalf of the user (not via the PTY, but via explicit "action" buttons), use `child_process.execFile` or `spawn` with args as arrays, never string concatenation:

```typescript
// CORRECT — no shell, args as array
import { execFile } from 'node:child_process';
execFile('git', ['commit', '-m', userMessage], { cwd: projectRoot });

// WRONG — shell injection risk if userMessage contains backticks, $(), etc.
exec(`git commit -m "${userMessage}"`, { cwd: projectRoot });
```

Node's `child_process.spawn` with `shell: false` (the default) is safe. `exec()` and `execFile()` with shell: true are not. Never use `shell: true`.

**(c) Auto-run commands must be user-visible first**

DockTerm must not silently invoke any command that has side effects on the project without the user seeing what will run.

#### "Run script" button: paste vs invisible exec — RECOMMENDATION

**Recommended: paste into terminal, do not invisibly exec.**

Rationale: Pasting the command string into the PTY and letting the user press Enter provides:
- Full visibility of what will run
- User confirmation before execution
- No additional privilege path through DockTerm's IPC
- No need to parse or validate the script command itself

Invisible exec (running `npm run build` silently in the background) should only be offered as an **opt-in** advanced mode in a future version, clearly labeled, and even then it must display output in a dedicated panel. For V1: paste only.

---

### 5. Secrets Handling in Config Inspection

#### Masking strategy

When DockTerm renders the Claude Code config (`~/.claude.json` or `~/.claude/` files) in a UI panel (for MCP server configuration or skills), apply these rules:

**Token-like pattern detection (regex):**
```
/[A-Za-z0-9_\-]{32,}/  — mask any string 32+ alphanumeric chars
/sk-[A-Za-z0-9_\-]{20,}/ — Anthropic key pattern
/Bearer\s+[^\s]{8,}/ — Bearer token in header values
/ghp_[A-Za-z0-9]{36}/ — GitHub personal access token pattern
/xoxb-[0-9A-Za-z\-]+/ — Slack bot token
```

**Masking rule:** Replace matched portions with `••••••••` (8 bullets). Show first 4 characters only if user explicitly clicks a "Reveal" icon per-field. In V1: **no reveal at all**. Mask and never show raw value. If the user needs to rotate a key, they use their text editor.

**URL credentials:** MCP server configs often contain URLs like `https://user:password@api.example.com/`. Never render the full URL. Extract and show only the scheme + host: `https://api.example.com/`. Credentials embedded in URLs are easy to miss and should never appear in any UI surface, masked or not.

**Logging:** Never log any value from Claude config files to the Electron console, main process logs, or crash reports. Log only field names and their presence/absence.

**App config file:** DockTerm's own `userData` config must never write any value that came from `~/.claude.json` or `~/.claude/`. There is no mechanism to copy Claude config values into DockTerm's own storage.

---

### 6. Threat Model (STRIDE-Lite)

#### Component Map

```
[Renderer / xterm.js / Monaco]
        │ contextBridge (narrow IPC)
[Preload Script]
        │ ipcMain channels
[Main Process]
   ├── PTY Service (node-pty)
   ├── FS Service (project jail)
   ├── Git Service (spawn, no shell)
   ├── Config Reader (claude-config-readonly, opt-in)
   ├── File Watcher (chokidar)
   └── App Config (userData)
        │
[OS / Shell / Project Files / ~/.claude/]
```

#### STRIDE Table

| Component | Threat | S | T | R | I | D | E | Mitigation |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| Renderer | XSS via rendered file content | | | | X | | X | Monaco renders code as text, not HTML. xterm.js handles terminal escape sequences — audit for ANSI injection if DockTerm echoes filenames into terminal. No `innerHTML` with user content. |
| Renderer | Malicious JS injected via React state | | | | X | | X | React escapes by default. No `dangerouslySetInnerHTML`. CSP `script-src 'self'` blocks inline scripts. |
| contextBridge | Overly broad API surface | X | | | X | | | One method per IPC verb. No `ipcRenderer.send` exposed directly. |
| Preload | Sender spoofing from injected frame | X | | | X | | | `validateSender` checks `senderFrame.url` matches `app://` or `localhost:5173`. |
| FS Service | Path traversal / jail escape | X | | | X | | | `resolveAndValidate()` with `realpath()` before prefix check. Symlink resolution mandatory. |
| FS Service | Symlink pointing outside root | X | | | X | | | `realpath()` resolves all symlink hops. Reject if resolved path escapes root. |
| FS Service | Windows case / UNC bypass | X | | | | | | Lowercase comparison on Windows. UNC detection and rejection. |
| Git Service | Shell injection via branch/commit message | X | | | X | | | `execFile('git', [...args])` — args always as array, `shell: false`. |
| Git Service | Malicious repo hooks (CVE-2025-48384) | | | | | | X | Set `core.hooksPath` to an empty/nonexistent directory for all DockTerm-initiated git calls. Never run `git clone --recursive`. Do not pass `--recurse-submodules` without explicit user confirmation. See dedicated section below. |
| PTY Service | Renderer from remote page drives PTY | X | | | X | | | `validateSender` on every `pty:write` / `pty:spawn`. Will-navigate blocked. setWindowOpenHandler deny. |
| PTY Service | DockTerm-constructed command injection | X | | | X | | | `execFile` with array args for all internal commands. "Run script" buttons paste to terminal. |
| Config Reader | Secrets leak to renderer | | | | X | | | Masking regex applied before sending to renderer. No raw values. |
| Config Reader | Config reader widened by symlinks | X | | | X | | | `realpath()` before allowing read; reject if resolved path is outside `~/.claude/` or outside home for `.claude.json`. |
| App Config (userData) | Secrets written by mistake | | | | X | | | No Claude config values ever flow to app config write path. Strict TypeScript schema for `AppConfig` type — no `any`. |
| File Watcher | Watcher follows symlinks out of project | | | | X | | | Configure chokidar with `followSymlinks: false`. |
| Electron binary | ASAR tampering | | X | | X | | | `embeddedAsarIntegrityValidation` + `onlyLoadAppFromAsar` fuses enabled. Code-signed binary. |
| Electron binary | `ELECTRON_RUN_AS_NODE` abuse | X | | | | | | `RunAsNode` fuse OFF. |
| Electron binary | `NODE_OPTIONS` injection | X | | | | | | `NodeOptions` fuse OFF. |
| Electron binary | Debugger attachment | X | | | | | | `NodeCliInspect` fuse OFF. |
| Project files | Hostile file names (null bytes, path separators) | X | | | X | | | Validate all filenames received via IPC: reject null bytes, reject path separators in the name component. Use `path.basename()` as final check. |
| Project files | Huge files causing memory exhaustion | | | | | X | | Enforce a read size limit (e.g., 10 MB) for file reads into Monaco. Stream large files rather than loading fully. |
| Supply chain | Malicious npm package | X | | | X | | | See supply-chain section below. |

#### Git Hooks in Untrusted Repos — Dedicated Analysis

**CVE-2025-48384** (arbitrary file write via carriage-return in `.gitmodules`, leading to hook plant) and **CVE-2025-65964** (core.hooksPath exploitation for RCE) demonstrate that git operations on untrusted repositories can execute attacker-controlled code.

DockTerm runs git commands against user-opened project folders. Mitigation strategy:

1. **Override `core.hooksPath` for all DockTerm-initiated git calls** by passing `-c core.hooksPath=` (empty string) or pointing to a guaranteed-empty directory. This disables hooks for DockTerm's git invocations without affecting the user's manual terminal work.
   ```typescript
   execFile('git', ['-c', 'core.hooksPath=', 'status'], { cwd: projectRoot });
   ```

2. **Never auto-run `git clone --recursive` or `--recurse-submodules`** without explicit user action and a confirmation dialog.

3. **Require Git >= 2.49.1** (bundled or detected at runtime) to ensure base protections against known CVEs. Show a warning if the system Git is older.

4. **Display a "git ops are run with hooks disabled" note** in documentation — this is a user-visible security property.

#### Supply Chain

- **Lockfile**: Commit `package-lock.json` (npm) or `yarn.lock`. Fail CI if lockfile is dirty.
- **Install scripts**: Audit `postinstall` scripts in all dependencies. Use `npm install --ignore-scripts` in CI if feasible. Known risk: `node-pty` requires a native build (`node-gyp`) — this is a legitimate script, not a red flag, but it must be the only install-script in the dependency graph.
- **Dependency pinning**: Pin to exact versions (`"electron": "32.1.0"` not `"^32.1.0"`) in production. Use Renovate or Dependabot for automated PRs with changelog review.
- **npm audit**: Run `npm audit --audit-level=high` in CI; block merges on high/critical findings.
- **`npm audit` stance**: Do not auto-apply audit fixes without review. The Electron ecosystem moves fast; an Electron version bump may fix more vulnerabilities than a transitive dep patch.

---

### 7. Destructive-Action Framework

#### Single confirmation pathway

All destructive actions must go through one shared `ConfirmDestructiveAction` dialog component. The dialog:
- Shows the exact command that will be executed (or exact description of the state change)
- Has only two buttons: **Cancel** (default, focused) and a clearly labeled action button (e.g., "Delete file", "Force push")
- Is not dismissable by pressing Escape or clicking outside (require explicit Cancel)
- Does not have a "don't show again" option for any V1 action

#### Actions requiring confirmation

| Action | Dialog trigger | Shown command / description |
|---|---|---|
| Delete file | Yes | `rm path/to/file.ts` (shown) |
| Delete directory | Yes | `rm -rf path/to/dir/` (shown) |
| Discard working tree changes | Yes | `git checkout -- .` or `git restore .` (shown) |
| Delete branch (local) | Yes | `git branch -d branchName` (shown) |
| Delete branch (force) | Yes | `git branch -D branchName` (shown) |
| Force push | Yes | `git push --force-with-lease origin branchName` (shown) |
| `git init` in folder | Yes | `git init path/to/folder` (shown) |
| Amend last commit | Yes | `git commit --amend` with description of what changes |

#### Actions that do NOT require confirmation (stateless or fully reversible with git)

- Stage a file, unstage a file
- Create a new file
- Switch branches (no local changes)
- Fetch (read-only)
- Normal commit (not amend)

#### Implementation note

The confirmation dialog must invoke the action itself (not return a boolean to the renderer and let the renderer call the IPC again). This ensures the confirmed command is exactly what executes — there is no TOCTOU window between confirmation and execution.

---

## Risks

1. **ASAR integrity bypass on Windows (CVE-2024-46992)**: Even with both ASAR fuses enabled, a Windows-specific bypass exists. Mitigation: stay current on Electron versions; code signing provides a second layer.

2. **Git hooks in project folders**: DockTerm opens arbitrary user-chosen project directories. A maliciously crafted repository could plant hooks that execute when DockTerm runs git operations. Severity: High if not mitigated. Mitigated by `-c core.hooksPath=` flag on all internal git calls.

3. **Symlink escape from project jail**: A symlink inside the project root pointing to `/etc/passwd` or `C:\Windows\System32\` would be followed by naive path operations. Mitigated by `realpath()` before all jail checks.

4. **Monaco / xterm.js `worker-src blob:` relaxation**: CSP must allow `worker-src blob:`. This permits any script in the renderer to spawn blob-URL workers. Since CSP also sets `script-src 'self'`, only scripts from the app bundle can run, limiting the risk. Accept.

5. **Claude config masking bypass**: User could view raw `~/.claude.json` in their text editor regardless of DockTerm masking. DockTerm's masking is UI hygiene (prevent shoulder-surfing, screenshots), not a cryptographic control. Document this honestly.

6. **Supply-chain attack via `node-pty` native build**: `node-pty` runs `node-gyp` at install time. A compromised `node-pty` could execute arbitrary code at build time. Pin to exact version; verify checksums; monitor for supply-chain incident advisories.

7. **Windows case-insensitive path confusion**: `C:\Project\FILE.TS` and `C:\project\file.ts` refer to the same file. All path comparisons on Windows must lowercase before prefix check.

8. **UNC path injection**: A renderer payload with `\\attacker\share\file` could escape the jail if UNC paths are not detected and rejected.

---

## Decisions (Recommended)

| # | Decision | Rationale |
|---|---|---|
| D1 | Use `app://` custom protocol in production, never `file://` | Eliminates grantFileProtocolExtraPrivileges risk; cleaner CSP |
| D2 | Run node-pty in main process (not utility process) for V1 | node-pty requires native module; incompatible with sandboxed renderer; utility process is the right long-term path but adds complexity for V1 |
| D3 | "Run script" buttons paste into PTY, do not invisibly exec | Visibility is a security feature; simpler implementation |
| D4 | No reveal of masked secrets in V1 | Simplest correct behavior; avoids building reveal flow that could have bugs |
| D5 | Set `core.hooksPath=` (empty) for all internal git calls | Eliminates hook execution risk for DockTerm-initiated operations with zero UX impact |
| D6 | Zod for all IPC payload validation | Single dependency; compile-time + runtime types in one schema |
| D7 | Never log values from Claude config files | Defense-in-depth against log scraping and crash report leaks |
| D8 | Confirmation dialog invokes action directly (not round-trip to renderer) | Eliminates TOCTOU race between confirm and execute |
| D9 | Pin Electron to exact version in package.json | Prevents silent version drift; Renovate handles updates with review |
| D10 | `worker-src blob:` in CSP is accepted risk | Required by Monaco and xterm.js; constrained by `script-src 'self'` |

---

## Rejected Ideas

| Idea | Reason Rejected |
|---|---|
| Generic IPC dispatcher (`fs:call(method, args)`) | Allows renderer to call arbitrary fs methods; classic confused deputy |
| Rate limiting on IPC channels in V1 | No remote content loaded; all callers are trusted local renderer; adds complexity with no benefit until plugin system exists |
| Exposing `ipcRenderer.send` directly via contextBridge | Renderer could send arbitrary channels; must wrap per-verb |
| `shell: true` in any child_process call | Enables shell interpolation; command injection risk |
| Storing Claude API keys in DockTerm's own userData | DockTerm never needs keys; would create a new secret store to protect |
| Reveal button for masked secrets in V1 | Adds UI surface that could have bugs; mask-only is simpler and sufficient |
| Running `git clone --recursive` automatically | Known RCE vector (CVE-2024-32002, CVE-2025-48384); require explicit user action |
| Auto-applying `npm audit fix` | May introduce breaking changes; require human review of each fix |
| Using Electron's `remote` module | Deprecated, removed in modern Electron; preload + IPC is the correct architecture |
| Showing full URLs from MCP configs (including credentials) | Credential URLs in UI = shoulder-surf / screenshot risk; show host only |

---

## V1 Recommendations

### Hardening Checklist

```
[ ] BrowserWindow: contextIsolation: true, nodeIntegration: false, sandbox: true,
    webSecurity: true, webviewTag: false, nodeIntegrationInSubFrames: false
[ ] Production protocol: app:// via protocol.handle(), NOT file://
[ ] will-navigate: preventDefault() on all webContents
[ ] setWindowOpenHandler: always return { action: 'deny' }
[ ] setPermissionRequestHandler: deny all
[ ] CSP: dev and prod variants as specified; worker-src blob: in both
[ ] @electron/fuses: RunAsNode OFF, NodeOptions OFF, NodeCliInspect OFF,
    EmbeddedAsarIntegrityValidation ON, OnlyLoadAppFromAsar ON,
    CookieEncryption ON, GrantFileProtocolExtraPrivileges OFF
[ ] IPC: one handler per verb, Zod validation on every handler, sender validated
[ ] IPC error responses: structured codes only, never raw stacks or absolute paths
[ ] FS jail: resolveAndValidate() with realpath(), lowercase on Windows,
    UNC detection, separate capability enums for project / claude-config / userData
[ ] Git ops: execFile with array args, shell: false, -c core.hooksPath= on all calls
[ ] "Run script" buttons: paste to PTY, do not execFile invisibly
[ ] Claude config rendering: mask all 32+ char alphanumeric strings, URLs show host only
[ ] Never log values from ~/.claude files
[ ] Confirmation dialog: single pathway, shows exact command, Cancel is default focus
[ ] chokidar: followSymlinks: false
[ ] package.json: pin Electron to exact version
[ ] CI: npm audit --audit-level=high, lockfile integrity check
[ ] File size limit: reject reads > 10 MB in fs:readFile IPC handler
[ ] Git version check: warn if system git < 2.49.1
```

### STRIDE Summary Table

See full STRIDE table in Section 6 above.

### Filesystem Jail Algorithm Summary

1. `path.resolve(base, inputPath)` — join with appropriate base for capability
2. `fs.realpath(joined)` — resolve all symlinks (catches symlink escape)
3. For new file writes where path doesn't exist: `realpath(parent) + basename`
4. Lowercase both resolved path and allowed root on Windows (`process.platform === 'win32'`)
5. Prefix check: `resolved.startsWith(allowedRoot + path.sep)`
6. Detect and reject UNC paths (`\\`) if project root is not UNC
7. Separate capability enum for three zones: `project`, `claude-config-readonly`, `app-userdata`
8. `claude-config-readonly` has no write IPC handlers — enforced at handler registration, not just at runtime

---

## Citations

- [Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security) — official 20-item checklist
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron Process Sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron Fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)
- [electron-builder: Adding Electron Fuses](https://www.electron.build/tutorials/adding-electron-fuses.html)
- [Bishop Fox: Design A Reasonably Secure Electron Framework](https://bishopfox.com/blog/reasonably-secure-electron)
- [IpcMainEvent — senderFrame](https://www.electronjs.org/docs/latest/api/structures/ipc-main-event)
- [CVE-2025-48384: Git arbitrary file write via carriage return in .gitmodules](https://securitylabs.datadoghq.com/articles/git-arbitrary-file-write/)
- [CVE-2025-46334: Git GUI Windows arbitrary code execution](https://zeropath.com/blog/git-gui-cve-2025-46334-arbitrary-code-execution)
- [CVE-2025-65964: core.hooksPath RCE in git-integrated tools](https://www.penligent.ai/hackinglabs/cve-2025-65964-weaponizing-git-hooks-in-n8n-for-critical-rce-in-ai-infrastructure/)
- [CVE-2024-32002: Git clone RCE via submodules](https://helpnetsecurity.com/2024/05/16/git-cve-2024-32002/)
- [CVE-2024-46992: ASAR integrity bypass on Windows](https://github.com/advisories/GHSA-xw5q-g62x-2qjc)
- [GitHub Blog: Securing Git — 5 new vulnerabilities](https://github.blog/open-source/git/securing-git-addressing-5-new-vulnerabilities/)
- [Electron Breach to Barrier: Sandbox blog post](https://www.electronjs.org/blog/breach-to-barrier)
- [Content Security Policy examples for Electron](https://content-security-policy.com/examples/electron/)
