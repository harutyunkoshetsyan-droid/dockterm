# DockTerm Security Model

DockTerm spawns shells, edits files, runs git, and (opt-in) reads Claude config.
It markets hard guarantees: **no telemetry, no accounts, no cloud, no stored
tokens, no remote content.** This document is the model behind those claims.

## Renderer containment

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Preload exposes a single frozen `window.dockterm` (invoke + on) — no Node
  objects, no arbitrary IPC channels.
- Production loads from a custom **`app://` protocol** (correct MIME + CSP, avoids
  `file://` elevated privileges). Dev loads the Vite server URL.
- Navigation is blocked (`will-navigate`), `window.open` is denied, and external
  http/https links are opened via `shell.openExternal` after an allowlist check.
- `setPermissionRequestHandler` / `setPermissionCheckHandler` deny everything.
- **CSP** (production): no remote origins; `worker-src blob:` for Monaco/xterm
  workers; `unsafe-eval` only for the packaged `app://` origin (Monaco needs it),
  never with any remote script present.
- **Fuses** flipped at package time (`build/afterPack.cjs`): `RunAsNode` off,
  `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off,
  `OnlyLoadAppFromAsar` on. asar integrity is embedded.

## IPC discipline

- Verb-specific channels only — no `fs:call(method, args)` confused-deputy.
- Every handler: `senderFrame` origin check → zod schema (with size caps) →
  handler → typed `Result`. Errors are `{ code, message }`, never raw stacks.

## Filesystem jail

`pathJail.resolveInside(root, relPath)` canonicalizes the root with `realpath`,
resolves the candidate, canonicalizes its nearest existing ancestor (so a symlink
mid-path can't escape), then prefix-checks — **case-insensitive on Windows**.
Traversal, absolute-outside, and symlink escapes throw `JailViolation`. The
watcher runs with `followSymlinks: false`.

Two additional capabilities are scoped **separately**, not by widening the jail:
the read-only, opt-in Claude user config (`~/.claude*`) and the app's own
`userData` config.

## Execution discipline

- The PTY runs whatever the user types — DockTerm grants no privilege a terminal
  doesn't. The control is *who can drive it*: only the sandboxed local renderer,
  and no remote content is ever loaded.
- Commands DockTerm itself constructs (git, project detection) use
  `execFile`/`spawn` with **array args, never `shell: true`**, never string
  concatenation.
- **Every `git` invocation sets `-c core.hooksPath=`** so an opened, untrusted
  repo's hooks can never execute (CVE-2024-32002 class). simple-git's
  `allowUnsafeHooksPath` is opted into *only* to set the empty, hook-disabling
  value.
- "Run script" buttons **paste into the mini terminal** — visible execution, never
  an invisible `exec`.
- Force push is only ever `--force-with-lease`. Hard reset, `git clean`, and
  unmerged-branch deletion are not in the UI — omission is the safety feature.

## Secrets

The MCP/skills panels are **parse-only and never execute anything**. `env` and
`header` values are reduced to key names; URLs are shown host-only with query and
embedded credentials stripped (`secretMask`). Secrets are never logged and never
written to app config. User-scope Claude config is read only when the user opts
in **and** the panel requests it (a double gate, default off).

## Privacy

No telemetry, analytics, or crash reporting exist in the code. At runtime the app
makes no network calls except the git operations you initiate, the external links
you click, and an optional check to GitHub for new releases (used for in-app
updates; on by default and toggleable in Settings → "Check automatically").

## What we do not claim

Enterprise security, perfect sandboxing of arbitrary terminal programs, or signed
builds (V1 ships unsigned). This is young software — please report issues per
[SECURITY.md](../SECURITY.md).
