# ADR-003: Monaco for editing and diffs (bundled locally)

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/04, 07

## Context

The editor panel needs: syntax highlighting by extension, tabs, dirty state, save, and —
critically — a first-class **diff view** for the Review panel. Candidates: Monaco, CodeMirror 6.

## Decision

**monaco-editor**, bundled locally from npm (never CDN), with Vite worker wiring
(`?worker` imports for editor/json/css/html/ts workers). The Review panel uses Monaco's
built-in **diff editor** (side-by-side, inline toggle). A single shared theme file defines
UI ↔ Monaco ↔ xterm colors together.

- Language mode by file extension only (no LSP, no intellisense beyond Monaco defaults —
  word-based suggestions disabled to keep it calm).
- Format Document exposed only when Monaco registers a formatter for the language
  (JSON/CSS/HTML/TS family); hidden otherwise.
- Binary/huge files (>1.5 MB or NUL-sniff) blocked with a friendly notice before load.
- External-change guard: mtime check before save → "File changed on disk" dialog
  (Reload / Overwrite / Cancel).

## Consequences

- Bundle size grows (~3–4 MB gzip) — accepted for a desktop app.
- CSP must permit `worker-src blob:`; if Monaco requires `unsafe-eval` in practice, scope it
  to the packaged `app://` origin only and verify during M0 (flagged from research 04).
- Diff for untracked files renders as all-additions (empty original side).

## Alternatives rejected

- **CodeMirror 6:** lighter, but the merge/diff view is assembly-required; Monaco's diff editor
  is exactly the Review panel. VS Code familiarity is also the target audience's muscle memory.
- **@monaco-editor/react default loader:** pulls Monaco from a CDN — violates the
  no-remote-content guarantee. Either configure its loader to the local instance or wrap
  Monaco directly; decided at implementation, local-only either way.
- **textarea/plain CodeJar "viewer":** fails the "no fake UI" bar for an editor panel.
