# ADR-006: Security model — sandboxed renderer, verb-IPC, fs jail, hardened git

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/08-security.md

## Context

DockTerm spawns shells, edits files, runs git, and (opt-in) reads Claude config. It markets
hard guarantees: no telemetry, no accounts, no cloud, no token storage, no remote content.

## Decision

### Renderer containment
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Preload exposes a single frozen `window.dockterm` API via contextBridge; no Node objects cross.
- Production loads via a custom **`app://` protocol** (correct MIME + CSP headers; avoids
  `file://` extra privileges); dev loads the Vite server URL.
- `will-navigate` blocked; `setWindowOpenHandler` → deny (external links via `shell.openExternal`
  after allowlist check http/https); `setPermissionRequestHandler` → deny all.
- CSP: no remote origins ever; `worker-src blob:` for Monaco/xterm workers; `unsafe-eval`
  only if Monaco demands it and then scoped to the packaged origin (verified at M0).
- **@electron/fuses** at package time: `runAsNode` off, `nodeOptions` off, `nodeCliInspect` off,
  `embeddedAsarIntegrityValidation` + `onlyLoadAppFromAsar` on (where platform-supported).

### IPC discipline
- Verb-specific channels only (`git:stageFiles`, `fs:writeFile`…) — no generic dispatchers.
- Every handler: zod-validate payload (shape + size caps) → capability check → narrow action.
- Sender validation on every handler (`senderFrame` must be our app origin).
- Errors returned as typed `{code, message}`; no raw stacks to the renderer.

### Filesystem jail
- All fs/git/watcher operations resolve against the opened project root:
  `realpath` first (symlink escape), then prefix check — case-insensitive on Windows,
  UNC rejected unless the root itself is UNC.
- Two additional read-only, individually-gated capabilities (not jail-wideners):
  Claude user config (opt-in toggle, ADR-005) and the app's own `userData` config.
- chokidar runs with `followSymlinks: false` + fixed ignore list.

### Execution discipline
- PTY = the user's shell; DockTerm grants nothing a terminal doesn't. The risk controlled is
  *who can drive it*: only our sandboxed renderer via validated IPC; no remote content exists.
- Programmatic processes only via `execFile`/spawn with array args; never `shell: true`,
  never string concatenation.
- Every git call: `-c core.hooksPath=` (malicious-repo hook RCE: CVE-2024-32002,
  CVE-2025-48384 class). Non-negotiable, tested.
- "Run script" buttons paste the command into the mini terminal (visible execution).
- Destructive actions flow through one ConfirmDialog that always displays the exact command.

### Privacy
- No telemetry of any kind ("not opt-out — absent"), no crash reporting in V1, no network
  calls at runtime except git's own (user-initiated push/pull) and `shell.openExternal`.
- Secrets masking per ADR-005; secrets never logged, never written to app config.

## Consequences

- Threat model + checklist published as `docs/SECURITY_MODEL.md`; security tests (jail
  traversal, IPC fuzz shapes, hooksPath presence) are release gates.
- Unsigned macOS builds in V1 are an honest, documented limitation (Gatekeeper bypass docs).

## Alternatives rejected

- `file://` production loads; generic `fs:call(method,…)` IPC; storing GitHub tokens for a
  "push without git config" convenience; telemetry "just for crash reports".
