# ADR-004: simple-git as the git layer (hardened invocation)

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/05-git-workflow.md, 08-security.md

## Context

The Git panel needs status/stage/unstage/commit/push/pull/branch/diff/show, typed errors,
and Windows+macOS reliability. Options: simple-git vs hand-rolled `execFile('git')` with
`--porcelain=v2` parsing.

## Decision

**simple-git 3.36+** with these non-negotiable hardening rules applied to *every* invocation:

1. `-c core.hooksPath=` on all commands (neutralizes malicious-repo hook RCE —
   CVE-2024-32002 class; see ADR-006).
2. User-supplied paths always passed after `--` separators; never string-interpolated.
3. Force push exclusively as `--force-with-lease` (bare `--force` does not exist in DockTerm).
4. Push/pull wrapped with a 30s "waiting for credentials" UX (system credential helpers —
   Git Credential Manager / osxkeychain — may pop blocking OS dialogs; DockTerm never stores
   or sees tokens) plus cancel.
5. `raw()` escape hatch allowed only inside gitService with the same hardening.
6. Checkpoint diffs gated behind `git cat-file -e <hash>` (hash may be unreachable after
   rebase/GC → graceful message).

## Destructive-operation matrix (V1)

| Operation | In V1 UI? | Guard |
|---|---|---|
| Discard file / all changes | Yes | Confirm dialog showing exact `git restore` command + file count + "cannot be undone" |
| Unstage | Yes | No confirm (non-destructive) |
| Delete merged branch | Yes | Confirm |
| Delete unmerged branch | No | — (terminal territory) |
| Force push | Yes | `--force-with-lease` only, double confirm |
| Hard/mixed reset, clean, stash-drop, amend, revert | **No** | Omitted from UI by design |

## Consequences

- Beginner Git Mode microcopy lives in the UI layer, mapped from typed gitService results.
- A collapsible "git output" log shows real command output for transparency.
- We accept simple-git's parsing as source of truth; porcelain-v2 parser not maintained by us.

## Alternatives rejected

- **Hand-rolled porcelain-v2 parser:** NUL-delimited rename parsing + stderr mapping +
  perpetual maintenance for zero V1 benefit.
- **Shelling out via the PTY:** terminal is the user's space; programmatic git must be
  invisible-but-auditable via the log panel instead.
- **isomorphic-git:** no system credential helper integration; diverges from user's real git.
