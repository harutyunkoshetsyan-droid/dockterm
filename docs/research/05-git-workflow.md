# 05 — Git Workflow Research

**Project:** DockTerm  
**Date:** 2026-06-11  
**Author:** Git Workflow Agent (planning phase)  
**Stack:** Electron + Node/TypeScript, Windows 11 primary, macOS equal target  
**Scope:** Planning only — no app code exists yet.

---

## Findings

### 1. Library Decision: simple-git vs execFile + --porcelain=v2

#### simple-git 3.36.0

- **Current version:** 3.36.0 (latest as of 2026-06; last published ~2 months ago)  
- **Downloads:** ~8 million/week (npm)  
- **Stars:** 3,800+; 1,549 commits on main; 48 open issues; 94 releases  
- **Source:** [steveukx/git-js on GitHub](https://github.com/steveukx/git-js)  
- **TypeScript:** First-class bundled types since v3; ES module + CJS + TS `moduleResolution: node16` all supported  
- **Security:** CVE-2026-28292 (case-sensitivity path traversal) patched in 3.32.3; additional unsafe-clone and exploit-config hardening in 3.36.0 — library actively tracks git security issues

**API coverage for DockTerm needs:**

| Operation | simple-git method | Notes |
|---|---|---|
| Status | `status(options?)` → `StatusResult` | Includes staged, unstaged, untracked, conflicted, renamed |
| Stage files | `add(files: string \| string[])` | Accepts glob or path array |
| Unstage | `reset(['HEAD', '--', path])` | Uses git reset HEAD |
| Restore file | `raw(['restore', path])` or `checkout(['--', path])` | `restore` is cleaner for V1 |
| Commit | `commit(msg, files?, options?)` → `CommitResult` | Returns hash, summary, branch |
| Push | `push(remote?, branch?, options?)` → `PushResult` | Pass `['--set-upstream']` in options |
| Pull | `pull(remote?, branch?, options?)` → `PullResult` | Returns summary, rejects on conflicts |
| Branch list | `branchLocal()` / `branch(options?)` → `BranchSummary` | Includes current, tracking, ahead/behind |
| Delete branch | `deleteLocalBranch(name, force?)` → `BranchSingleDeleteResult` | |
| Diff (raw text) | `diff(options?)` → `string` | Pass `['--unified=3', path]` for file diff |
| Diff summary | `diffSummary(options?)` → `DiffResult` | File-level stats |
| Show commit | `show(option?)` → `string` | Pass commit hash |
| Log | `log<T>(options?)` → `LogResult<T>` | Supports `--max-count`, `--format` |
| Stash | `stash(options?)` → `string` | Pass `['push', '-m', label]` |
| Stash list | `stashList()` → `LogResult` | |
| Check is repo | `checkIsRepo()` → `boolean` | Fast pre-check |
| Remote list | `getRemotes(verbose)` → `RemoteWithRefs[]` | For no-remote detection |
| Config read | `getConfig(key)` → `ConfigGetResult` | For credential helper detection |
| Raw passthrough | `raw(commands)` → `string` | Escape hatch for anything not wrapped |

**Error types:**

```typescript
import { GitError, GitResponseError, TaskConfigurationError } from 'simple-git';

// GitError — base class, git process non-zero exit
// GitResponseError<T> — parsed result available (e.g., merge conflicts: GitResponseError<MergeResult>)
// TaskConfigurationError — bad API call (not sent to git at all)
```

`instanceof` checks work correctly; TypeScript discriminated union via generics.  
Source: [simple-git.d.ts at main](https://github.com/steveukx/git-js/blob/main/simple-git/typings/simple-git.d.ts)

#### execFile + --porcelain=v2 approach

`git status --porcelain=v2 --branch` (requires git 2.13.2+, well within the 2.49 constraint) produces machine-stable output:

```
# branch.oid <sha>
# branch.head <name>   (or "(detached)")
# branch.upstream <remote>/<branch>
# branch.ab +<ahead> -<behind>
1 .M N... 100644 100644 100644 <sha1> <sha2> path         # unstaged modified
1 M. N... 100644 100644 100644 <sha1> <sha2> path         # staged modified
2 R. N... 100644 100644 100644 <sha1> <sha2> score newpath\0oldpath  # renamed
u UU N... 000000 000000 000000 <sha1> <sha2> <sha3> path  # conflicted
? path                                                        # untracked
```

Renamed files use NUL separator (`-z` flag needed); conflicted files use `u` prefix with XY code `UU`, `AA`, etc.  
Source: [git-status manual](https://www.kernel.org/pub/software/scm/git/docs/git-status.html), [porcelain v2 nushell discussion](https://github.com/nushell/nushell/discussions/17003)

**Comparison:**

| Criterion | simple-git 3.36 | execFile + porcelain=v2 |
|---|---|---|
| Lines of code for full feature set | ~50 (all methods built-in) | ~400–600 (parser + wrappers) |
| TypeScript types | Bundled, rich | Manual definitions required |
| Error handling | Structured exception hierarchy | Must parse stderr + exit codes |
| Maintenance burden | Library owns it | We own it forever |
| Performance overhead | One extra JS layer (~0–2ms per call) | Marginally lower cold overhead |
| Security patching | Library team (active) | We must track git output format changes |
| Porcelain v2 renamed/NUL | Library handles internally | Must implement NUL-split parser |
| Windows path quoting | Library handles | Known pitfall on Windows (spaces in paths) |
| `raw()` escape hatch | Yes — for any uncovered case | N/A |

**Performance note:** Both approaches spawn the same `git` binary. simple-git's overhead is the JS parsing layer: negligible (sub-millisecond) for interactive UI use cases. The `spawn`/`execFile` performance difference on Windows is a Node.js child_process issue affecting both approaches equally.  
Source: [Node.js issue #21632](https://github.com/nodejs/node/issues/21632)

---

### 2. Status Model and Microcopy

#### Git Status Categories

| Git state | porcelain=v2 XY | simple-git StatusResult field |
|---|---|---|
| Staged new file | `A.` | `created[]` (index) |
| Staged modified | `M.` | `staged[]` |
| Staged deleted | `D.` | `deleted[]` (index) |
| Staged renamed | `R.` | `renamed[]` (index) |
| Unstaged modified | `.M` | `modified[]` |
| Unstaged deleted | `.D` | `deleted[]` (working tree) |
| Untracked | `??` | `not_added[]` |
| Conflicted | `UU`, `AA`, etc. | `conflicted[]` |
| Ignored | `!!` | `ignored[]` |

#### Competitor Microcopy Reference

**VS Code SCM panel** ([staging-commits docs](https://code.visualstudio.com/docs/sourcecontrol/staging-commits)):

| Concept | VS Code string |
|---|---|
| Unstaged section header | "Changes" |
| Staged section header | "Staged Changes" |
| Stage a file (hover tooltip) | "Stage Changes" (+) |
| Unstage a file (hover tooltip) | "Unstage Changes" (−) |
| Commit button | "Commit" / "Commit All" |
| Discard | "Discard Changes" |
| File status badge | "U" (untracked), "M" (modified), "D" (deleted) |

**GitHub Desktop** (from source issues and docs):

| Concept | GitHub Desktop string |
|---|---|
| Unstaged changes area | "Changes" tab |
| No changes state | "No local changes" |
| Push first-time | "Publish Branch" (button label when no upstream) |
| Stage all checkbox | Checkbox at top of Changes list (no explicit label; implies select-all) |

Note: GitHub Desktop intentionally avoids the word "stage/unstage" in primary UI — it uses checkboxes to include/exclude files from the commit. This is a deliberate beginner-friendly design choice (issue [#4591](https://github.com/desktop/desktop/issues/4591) confirms "staging not surfaced").

**lazygit** ([User Guide](https://lazygit.dev/docs/guide/), [files panel blog](https://oliverguenther.de/2021/04/lazygit-the-files-panel/)):

| Concept | lazygit string |
|---|---|
| Working tree section | "Files panel" |
| Unstaged section | "Unstaged changes" (red) |
| Staged section | "Staged changes" (green) |
| Stage/unstage file key | `Space` — "Stage / unstage file" |
| Stage all | `a` — "Stage all / unstage all" |
| Hunk staging | `Enter` — "Open file diff to stage individual lines" |
| Discard | `d` — "Discard changes to file" |
| Commit | `c` — "Commit staged changes" |

#### DockTerm Proposed Microcopy (Beginner Git Mode ON)

These strings must be short, concrete, and non-jargon where possible. Beginner Mode adds the parenthetical explanations in the UI tooltip layer only (not inline in the label).

| Concept | DockTerm Label | Tooltip (Beginner Mode) |
|---|---|---|
| Section: unstaged | **"Changes"** | "Files modified since your last commit. Not yet included in any commit." |
| Section: staged | **"Ready to commit"** | "Changes you've selected to include in the next commit." |
| Section: untracked | **"New files"** | "Files git doesn't know about yet. Stage them to start tracking." |
| Stage a file | **"Include"** (+) | "Add this change to your next commit." |
| Unstage a file | **"Exclude"** (−) | "Remove this change from the next commit (keeps your edits)." |
| Stage all | **"Include all"** | "Add all changes to the next commit." |
| Unstage all | **"Exclude all"** | "Remove all changes from the next commit." |
| Commit button | **"Commit"** | "Save a snapshot of your ready changes with a message." |
| Push | **"Push"** | "Send your commits to the remote (e.g. GitHub)." |
| Pull | **"Pull"** | "Download commits from the remote and apply them here." |
| Publish branch | **"Publish branch"** | "This branch doesn't exist on the remote yet. Push it now to share it." |
| Discard file | **"Discard changes"** | "Permanently undo edits to this file. This cannot be undone." |

Expert users: all tooltips suppressed when Beginner Git Mode is OFF. Labels remain identical — expert users read the icon/gesture, not the tooltip.

---

### 3. Edge Cases and Friendly Flows

#### 3.1 Repository with Zero Commits

**Detection:**  
`git status` on an empty repo outputs: `fatal: not a git repository` (wrong path) OR the branch header `# branch.oid (initial)` in porcelain=v2. simple-git's `checkIsRepo()` returns `false` if not a repo; for an initialized-but-empty repo, `status()` succeeds but `StatusResult.tracking` is null and `log()` throws because there is no HEAD.

Alternatively: `git rev-parse HEAD` exits non-zero with `fatal: ambiguous argument 'HEAD'` on an empty repo.

**Flow:**

```
Detection: await git.raw(['rev-parse', '--verify', 'HEAD']).catch(() => 'empty')
Banner: "This repo has no commits yet."
Explanation (Beginner): "Make your first commit to start tracking changes."
Action offered: [Make first commit] — opens commit modal with staged files (if any)
```

Git commands still work for staging (`git add`) and committing in an empty repo; only history/log/diff-vs-HEAD is unavailable.

#### 3.2 No Remote Configured

**Detection:**  
`getRemotes(false)` returns empty array `[]`.

**Flow:**

```
Detection: (await git.getRemotes()).length === 0
Banner: "No remote connected"
Explanation (Beginner): "To push or pull, connect a remote like GitHub. Paste a URL below."
Action: [Add remote] — prompts for URL, runs: git remote add origin <url>
Push/Pull buttons: disabled with tooltip "Add a remote first."
```

#### 3.3 Branch with No Upstream (Publish Branch)

**Detection:**  
`StatusResult.tracking === null` when `StatusResult.current` is set.  
Also: `branch(['-vv'])` shows `[gone]` or no tracking annotation.

**Flow:**

```
Detection: status.tracking === null && remotes.length > 0
Push button label: "Publish branch"
Explanation (Beginner): "This branch only exists on your machine. Publish it to share it."
Action: git push(['--set-upstream', 'origin', branchName])
```

Command issued: `git push --set-upstream origin <current-branch>`  
Do NOT auto-infer remote name if multiple remotes exist — prompt user to pick.

#### 3.4 Diverged from Remote (Local and Remote Have Different Commits)

**Detection:**  
`StatusResult.ahead > 0 && StatusResult.behind > 0`  
(simple-git `status()` populates `ahead` and `behind` counts after a fetch)

**Flow — V1 (explain only, no auto-rebase):**

```
Banner: "Your branch has diverged from origin/<branch>."
Detail: "You have {ahead} local commit(s) not on remote, and {behind} remote commit(s) not here."
Explanation (Beginner): "You and someone else (or another device) both added commits. Pull first to merge the remote changes, then push."
Action offered: [Pull] — runs git pull (fast-forward or merge commit; no rebase in V1)
No auto-rebase offered in V1. Rebase is a V2 feature.
```

Note: A plain `git pull` on a diverged branch creates a merge commit. This is intentional for V1 safety; no `--rebase` flag.

#### 3.5 Merge Conflicts Present

**Detection:**  
`StatusResult.conflicted.length > 0`

**Flow:**

```
Banner (red): "Merge conflicts need to be resolved."
File list: show conflicted files with ⚠ icon
Explanation (Beginner): "Git couldn't automatically combine changes in these files. You need to edit them to choose what to keep."
Action offered: [Open terminal] — opens DockTerm's integrated terminal at repo root
NO conflict-resolution UI in V1.
Commit button: disabled with tooltip "Resolve all conflicts before committing."
```

The terminal is the correct tool for conflict resolution in V1. Attempting to build a merge editor is out of scope.

#### 3.6 Detached HEAD

**Detection:**  
`git status --porcelain=v2 --branch` outputs `# branch.head (detached)`.  
simple-git: `status().current === null` (no branch name) in some versions; safer: `raw(['rev-parse', '--abbrev-ref', 'HEAD'])` returns `HEAD` when detached.

**Flow:**

```
Banner (orange): "Detached HEAD — not on a branch."
Detail: "HEAD at commit {shortHash} ({date})"
Explanation (Beginner): "You've checked out a specific commit directly. Changes you commit here won't belong to any branch and may be hard to find later."
Actions: [Create branch here] (git checkout -b <name>) | [Go to branch] (branch picker)
Push button: disabled — cannot push without a branch.
```

#### 3.7 Auth Failure on Push/Pull

**Detection:**  
Push/pull error output contains: `fatal: Authentication failed`, `remote: Invalid username or password`, `Permission denied (publickey)`, `error: 403`, or `error: 401`.  
Match stderr with: `/authentication failed|permission denied|invalid credentials|403|401/i`

**Architecture constraint:** DockTerm never stores credentials. Authentication is entirely delegated to:
- **Windows:** Git Credential Manager (GCM) — ships with Git for Windows 2.x+, stores in Windows Credential Manager  
- **macOS:** osxkeychain credential helper — native Keychain integration  

Both helpers launch OS-native credential dialogs when credentials are missing or expired. These dialogs appear outside DockTerm.

**Flow:**

```
Banner (red): "Authentication failed."
Detail (show raw git error output in collapsible log)
Explanation (Beginner on Windows): "Git couldn't log in to the remote. Windows should have shown a login dialog — if it didn't, open Git Credential Manager from the Start menu and update your credentials."
Explanation (Beginner on macOS): "Git couldn't log in to the remote. macOS Keychain should have prompted you. If not, run 'git credential-osxkeychain erase' in the terminal for this host, then try again."
Action: [Open terminal] — user can run git push and interact with the credential dialog manually
Note: publickey errors suggest SSH key issue; direct user to their remote's SSH docs.
```

Never prompt for username/password inside DockTerm. This is both a security decision and a scope decision.

#### 3.8 Large Repos — Status Debounce and File Watcher

**Problem:** Calling `git status` on every file save causes status-storms in large repos (e.g., with large `node_modules` or generated files). VS Code's own file watcher has well-documented CPU issues with chokidar over large folders.  
Sources: [VS Code issue #3998](https://github.com/Microsoft/vscode/issues/3998), [chokidar issue #447](https://github.com/paulmillr/chokidar/issues/447)

**Strategy:**

1. **Watch with chokidar:** Watch `<repoRoot>` excluding `.git/objects`, `node_modules`, `dist`, `build`, `.next`, `*.log`. Chokidar `ignoreInitial: true` to avoid startup storm.
2. **Debounce:** On any file change event, debounce `git status` call by **500ms** (chokidar default is 400ms; use 500ms for git which is heavier). Use `lodash.debounce` or a simple `setTimeout` pattern — not a third-party debounce lib for this.
3. **Debounce ceiling:** If no status result received within 5s, run anyway (prevents stale UI).
4. **Avoid watching `.git` directly** for status triggers (git operations already trigger programmatic refresh).
5. **Exclude from watcher** via `chokidar.watch(repoRoot, { ignored: /(^|[\/\\])\..|(node_modules|dist|build)/ })` — standard regex pattern.
6. **Manual refresh button** always available as escape hatch.

---

### 4. Danger Matrix

Operations are classified by destructive potential. "Destructive" = data that was in working tree or commit history can be permanently lost.

| Operation | V1 Include? | Confirmation Copy | Safe Git Command | Notes |
|---|---|---|---|---|
| **Discard file changes** | YES | "Discard changes to `{filename}`? This cannot be undone." [Discard] [Cancel] | `git restore -- <path>` | NOT `git checkout -- <path>` (deprecated for this use) |
| **Discard all unstaged** | YES | "Discard ALL unstaged changes? {N} file(s) will be permanently modified. This cannot be undone." [Discard all] [Cancel] | `git restore .` | Two-step: confirm dialog must show file count |
| **Unstage file** | YES | No confirmation needed — non-destructive | `git restore --staged -- <path>` | Working copy is untouched |
| **Unstage all** | YES | No confirmation — non-destructive | `git restore --staged .` | Working copy is untouched |
| **Delete local branch** | YES (only non-current, fully-merged) | "Delete branch `{name}`? It has been merged and can be safely removed." [Delete] [Cancel] | `git branch -d <name>` | Use `-d` not `-D`; refuse if unmerged |
| **Delete unmerged branch** | NO (V1 omit) | — | `git branch -D <name>` | Too dangerous for V1; expert can use terminal |
| **Force push** | YES (with lease only) | "Force-push `{branch}` to `{remote}`? This will rewrite history on the remote. Anyone else with this branch will need to re-sync." [Force push] [Cancel] | `git push --force-with-lease` | NEVER `git push --force`; `--force-with-lease` aborts if remote has new commits since last fetch. Source: [DataCamp force-push guide](https://www.datacamp.com/tutorial/git-push-force), [Delft Stack comparison](https://www.delftstack.com/howto/git/git-push-force-with-lease/) |
| **Hard reset** | NO (V1 omit) | — | `git reset --hard` | Permanently discards commits AND working tree; too nuclear for V1 |
| **Soft reset** | NO (V1 omit) | — | `git reset --soft` | Moves commits back to staged; confusing for beginners |
| **Mixed reset** | NO (V1 omit) | — | `git reset HEAD~N` | Same; omit in V1 |
| **Amend commit** | NO (V1 omit) | — | `git commit --amend` | Rewrites history; if already pushed, requires force-push — too complex for V1 |
| **Revert commit** | NO (V1 omit) | — | `git revert <hash>` | Safe (adds new commit), but UI complexity deferred to V2 |
| **Clean untracked files** | NO (V1 omit) | — | `git clean -fd` | Permanently removes files; too dangerous; use terminal |
| **Stash drop** | NO (V1 omit) | — | `git stash drop` | If stash is the only copy, drop = data loss |

**Key omission rationale:** Hard reset, clean, amend, and stash-drop are omitted from V1 not because they are rare, but because their destructive consequences are non-obvious to the beginner audience and the confirmation dialog alone is insufficient protection. The terminal is always available for these operations.

**`git restore` vs `git checkout`:** Always use `git restore` (introduced git 2.23, well within 2.49 constraint). `git checkout -- <file>` is deprecated for this use and conflates branch switching with file restoration, which is confusing in code and in error messages.

---

### 5. Checkpoint Feature Design

#### 5.1 Data Model

Stored in app config (per project, e.g., `~/.config/dockterm/projects/<id>.json`):

```typescript
interface Checkpoint {
  id: string;             // nanoid
  commitHash: string;     // full SHA-1
  branch: string;         // branch name at checkpoint time
  timestamp: number;      // Unix ms
  label: string;          // user-provided or auto-generated ("Before refactor", "Session start")
  repoPath: string;       // absolute path
}
```

#### 5.2 Creating a Checkpoint

```
User clicks "Checkpoint"
→ Check repo dirty (status().files.length > 0)
  → If CLEAN: save {commitHash: HEAD, branch, timestamp, label} to config
  → If DIRTY:
      Prompt: "Your repo has unsaved changes. What would you like to do?"
      Options:
        [Commit first]  → opens commit modal; after commit, checkpoint is auto-saved
        [Stash changes] → runs `git stash push -m "DockTerm checkpoint {timestamp}"`, then saves checkpoint
        [Cancel]        → abort
```

Stash approach: the stash itself contains the working-tree state; the checkpoint stores the HEAD commit hash as the "clean" baseline. The stash ref is stored alongside checkpoint: `{ ...checkpoint, stashRef: 'stash@{0}' }`.

#### 5.3 Viewing Checkpoint Diff

Checkpoint review panel shows `git diff <checkpointHash>` — diff of current working tree against the checkpoint commit.

```typescript
// Raw text diff for display
const diff = await git.diff([checkpointHash]);

// Summary (file list + stats) for overview
const summary = await git.diffSummary([checkpointHash]);
```

#### 5.4 Unreachable Checkpoint Hash (Post-Rebase/Amend)

**Detection:**

```typescript
const reachable = await git.raw(['cat-file', '-e', checkpointHash])
  .then(() => true)
  .catch(() => false);
```

`git cat-file -e <hash>` exits 0 if object exists, non-zero if not. An unreachable hash (pruned after rebase/GC) returns false.

**Flow:**

```
Banner: "Checkpoint '{label}' is no longer reachable."
Explanation: "This commit was rewritten (e.g., via rebase or amend). The checkpoint reference is stale."
Actions: [Delete checkpoint] [Keep anyway]
Do NOT crash; do NOT attempt to diff against an unreachable hash.
```

#### 5.5 "Changed Since Last Commit" View

```typescript
// Diff working tree + index vs HEAD
const diff = await git.diff(['HEAD']);
const summary = await git.diffSummary(['HEAD']);
```

Shows all changes (staged and unstaged) relative to `HEAD`. This is the primary "what did Claude Code change?" view.

#### 5.6 "Changed Since App Opened" View

This is a **session log** — maintained purely in-memory/app state, not in git:

```
On app open:
  1. Record openedAt = Date.now()
  2. Record openingHash = await git.raw(['rev-parse', 'HEAD'])
  3. Track file change events from chokidar (path + timestamp)

Session diff:
  git diff <openingHash>  →  all changes since app opened (for committed changes)
  Plus: in-memory list of files touched since open (for uncommitted activity)
```

The session log complements checkpoint by giving a lightweight "what happened today" view without requiring the user to create a checkpoint.

---

### 6. Commit UX

#### 6.1 Commit Modal

**Fields:**

- **Subject line** (required, single line, ≤72 chars recommended — show char counter above 50)  
- **Body** (optional, multi-line textarea)  
- **File list** (read-only, shows staged files only — non-staged files shown as greyed out reminder)

**Validation:**

```typescript
const isValid = subject.trim().length > 0;
// Show inline error: "Commit message is required." if subject is empty on submit attempt
// Subject-only commits are valid (body is optional per git convention)
```

**Keyboard shortcut:** `Cmd+Enter` (macOS) / `Ctrl+Enter` (Windows) to commit.  
Implementation: keydown handler on modal with `(e.metaKey || e.ctrlKey) && e.key === 'Enter'`.

**Staged-only commit:**  
`git.commit(message)` — simple-git commits only staged files by default (does NOT pass `-a`). This is correct behavior for DockTerm.

**After success:**

```
Modal closes
Toast notification: "Committed {shortHash} — '{subject}'" (8-char hash)
Git panel refreshes (status poll triggered immediately, no debounce wait)
Push button activates if remote is configured
```

#### 6.2 Pull/Push Progress Reporting

simple-git's `outputHandler` callback receives stdout/stderr lines as they arrive:

```typescript
git.outputHandler((command, stdout, stderr) => {
  stdout.on('data', (chunk: Buffer) => appendToGitLog(chunk.toString()));
  stderr.on('data', (chunk: Buffer) => appendToGitLog(chunk.toString()));
});
```

**UI pattern:**

```
Push/Pull button shows spinner while in-flight
Collapsible "Git output" log panel (collapsed by default)
Auto-expands if an error occurs
Shows raw git output (progress lines, delta counts, etc.)
"Receiving objects: 71% (143/201)" style lines are preserved verbatim
```

Push: `await git.push(remote, branch, options)` — returns `PushResult` on success, throws `GitError` on failure. Failure message is surfaced in the log panel.

---

### 7. gitService API Surface (TypeScript IPC interface)

These functions live in the Electron main process (`src/main/gitService.ts`) and are exposed to the renderer via IPC (`ipcMain.handle`). Return shapes are plain JSON-serializable objects (no class instances cross IPC).

```typescript
// ─── Status & Info ───────────────────────────────────────────────────────────

/** Full working tree status. Called on init and after file changes (debounced). */
getStatus(repoPath: string): Promise<GitStatus>

interface GitStatus {
  branch: string | null;           // null if detached HEAD
  tracking: string | null;         // e.g. "origin/main", null if no upstream
  ahead: number;
  behind: number;
  staged: GitFileEntry[];
  unstaged: GitFileEntry[];
  untracked: string[];
  conflicted: string[];
  isDetachedHead: boolean;
  hasNoCommits: boolean;           // true if repo initialized but empty
  remotes: string[];               // list of configured remote names
}

interface GitFileEntry {
  path: string;
  originalPath?: string;           // set for renames
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'conflicted';
}

// ─── Staging ─────────────────────────────────────────────────────────────────

/** Stage one or more files. */
stageFiles(repoPath: string, paths: string[]): Promise<void>

/** Unstage one or more files (back to unstaged, working copy preserved). */
unstageFiles(repoPath: string, paths: string[]): Promise<void>

/** Stage all unstaged + untracked files. */
stageAll(repoPath: string): Promise<void>

/** Unstage all staged files. */
unstageAll(repoPath: string): Promise<void>

// ─── Discard (destructive) ───────────────────────────────────────────────────

/** Discard working-tree changes to specific files. Irreversible. */
discardFiles(repoPath: string, paths: string[]): Promise<void>

/** Discard ALL unstaged working-tree changes. Irreversible. */
discardAll(repoPath: string): Promise<void>

// ─── Commit ──────────────────────────────────────────────────────────────────

/** Commit staged files with a message. Returns result summary. */
commitStaged(repoPath: string, subject: string, body?: string): Promise<CommitSummary>

interface CommitSummary {
  hash: string;           // full SHA
  shortHash: string;      // 8 chars
  branch: string;
  subject: string;
  filesChanged: number;
}

// ─── Push / Pull ─────────────────────────────────────────────────────────────

/** Push current branch. Handles --set-upstream if no tracking branch. */
pushBranch(repoPath: string, options: PushOptions): Promise<PushResult>

interface PushOptions {
  remote: string;
  branch: string;
  setUpstream: boolean;       // if true, passes --set-upstream
  forceLease: boolean;        // if true, passes --force-with-lease (never bare --force)
}

interface PushResult {
  success: boolean;
  errorMessage?: string;      // raw git stderr on failure
  isAuthError: boolean;
  needsUpstream: boolean;     // remote rejected because no upstream configured
}

/** Pull current branch. No --rebase in V1. */
pullBranch(repoPath: string, remote: string, branch: string): Promise<PullResult>

interface PullResult {
  success: boolean;
  hasConflicts: boolean;
  conflictedFiles: string[];
  errorMessage?: string;
  isAuthError: boolean;
}

// ─── Branch ──────────────────────────────────────────────────────────────────

/** List local branches with tracking info. */
listBranches(repoPath: string): Promise<BranchEntry[]>

interface BranchEntry {
  name: string;
  current: boolean;
  tracking: string | null;
  ahead: number;
  behind: number;
}

/** Switch to an existing branch. */
checkoutBranch(repoPath: string, branchName: string): Promise<void>

/** Create and switch to a new branch. */
createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void>

/** Delete a local branch (only merged, uses -d). */
deleteLocalBranch(repoPath: string, branchName: string): Promise<void>

// ─── Diff & History ──────────────────────────────────────────────────────────

/** Raw unified diff for one or more paths vs HEAD (or a given ref). */
getDiff(repoPath: string, options: DiffOptions): Promise<string>

interface DiffOptions {
  ref?: string;          // defaults to HEAD; pass checkpoint hash for checkpoint view
  paths?: string[];      // omit for whole-repo diff
  staged?: boolean;      // if true, passes --staged
}

/** File-level diff summary (changed files + insertions/deletions). */
getDiffSummary(repoPath: string, options: DiffOptions): Promise<DiffFileSummary[]>

interface DiffFileSummary {
  path: string;
  insertions: number;
  deletions: number;
  binary: boolean;
}

/** Git log — recent commits. */
getLog(repoPath: string, options: LogOptions): Promise<LogEntry[]>

interface LogOptions {
  maxCount?: number;     // default 50
  ref?: string;          // branch or hash; defaults to HEAD
}

interface LogEntry {
  hash: string;
  shortHash: string;
  date: string;          // ISO 8601
  message: string;
  author: string;
}

/** Show full content of a specific commit. */
showCommit(repoPath: string, hash: string): Promise<string>

// ─── Stash ───────────────────────────────────────────────────────────────────

/** Create a stash (optionally with message). */
createStash(repoPath: string, message?: string): Promise<void>

/** List stash entries. */
listStashes(repoPath: string): Promise<StashEntry[]>

interface StashEntry {
  index: number;
  message: string;
  date: string;
}

// ─── Checkpoint ──────────────────────────────────────────────────────────────

/** Check if a commit hash is reachable in the current repo. */
isHashReachable(repoPath: string, hash: string): Promise<boolean>

/** Diff current working tree vs a checkpoint commit hash. */
getDiffVsCheckpoint(repoPath: string, hash: string): Promise<string>

// ─── Remote ──────────────────────────────────────────────────────────────────

/** List configured remotes. */
listRemotes(repoPath: string): Promise<RemoteEntry[]>

interface RemoteEntry {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

/** Add a remote. */
addRemote(repoPath: string, name: string, url: string): Promise<void>

// ─── Repo Check ──────────────────────────────────────────────────────────────

/** True if the path is inside a git repository. */
isGitRepo(repoPath: string): Promise<boolean>

/** Return the git repository root (walks up from path). */
getRepoRoot(path: string): Promise<string | null>
```

---

## Risks

1. **simple-git on Windows path quoting:** simple-git handles path quoting internally, but paths with Unicode characters or trailing spaces have historically caused issues. Mitigation: always pass absolute paths; add integration tests on Windows with spaces-in-path repos.

2. **Chokidar CPU on large repos:** Chokidar is known to cause high CPU on folders with many files. Mitigation: exclude `node_modules`, `dist`, `build`, `.git/objects` from the watcher from day one; expose `files.watcherExclude` equivalent in DockTerm settings.

3. **Credential helper dialog blocks IPC:** When `git push` triggers a GCM or osxkeychain dialog, the `git` process is blocked waiting for the OS dialog. The IPC call will hang. Mitigation: set a generous push timeout (30s); show "Waiting for login..." spinner; allow cancel. On Windows, GCM sometimes spawns a subprocess that requires a visible window — Electron must not suppress this.

4. **simple-git security surface (CVE history):** The library has had multiple CVEs related to path injection via unsafe git options (3.32.x fixes). Never pass user-provided strings directly as options to simple-git methods without sanitization. Use `raw(['--', userPath])` with `--` to terminate option parsing before paths.

5. **Porcelain v2 renamed-file NUL separator:** simple-git's internal `status()` parser handles the NUL-delimited rename format correctly. If we ever fall back to raw parsing, the NUL split must be handled explicitly (not a newline split).

6. **Empty repo log():** Calling `git.log()` on a repo with no commits throws. Always gate log calls behind `!hasNoCommits` check.

7. **Checkpoint hash reachability after GC:** `git gc --prune=now` can remove objects that were reachable via stash but are no longer referenced. Always check `cat-file -e` before diffing; stash-backed checkpoints are safer (stash refs survive GC).

---

## Decisions (Recommended)

1. **Use simple-git 3.36.0** — library over raw execFile. Rationale: complete TypeScript types, structured error hierarchy, active maintenance (security patches), 8M weekly downloads indicating production battle-testing, and `raw()` escape hatch for anything uncovered. Development velocity gain outweighs the trivial runtime overhead.

2. **Use `git restore` (not `git checkout`)** for discard operations. Both are present in git 2.49; `restore` is the correct modern interface.

3. **Use `git push --force-with-lease` exclusively** — never expose `--force` in the UI. `--force-with-lease` checks that the remote hasn't advanced since last fetch, preventing accidental history destruction in collaborative repos.

4. **Debounce git status at 500ms** with chokidar file watcher. Exclude generated dirs from day one.

5. **No in-app credential storage; no credential prompt inside DockTerm.** Delegate entirely to system helpers (GCM on Windows, osxkeychain on macOS). Surface auth failures with OS-specific guidance.

6. **Checkpoint stores commit hash + optional stash ref** in app config (per project). Check reachability with `cat-file -e` before any diff.

7. **Beginner Git Mode on by default**, toggled via settings. Adds tooltips and inline explanations; does not change labels or functionality. Expert mode suppresses tooltips only.

8. **V1 omits:** hard reset, soft reset, mixed reset, commit amend, revert, git clean, stash drop, unmerged branch deletion, rebase.

---

## Rejected Ideas

1. **Building a custom porcelain=v2 parser:** Rejected — maintenance burden, NUL-handling complexity on Windows, no benefit over simple-git which already does this internally and patches CVEs.

2. **In-app conflict resolution UI (V1):** Rejected — correct conflict resolution requires a 3-pane diff editor (ours, theirs, base). Scope is too large for V1; the terminal is the right tool.

3. **Auto-rebase on pull:** Rejected for V1. Rebase rewrites history and can leave users in confusing intermediate states. Merge-based pull (the git default) is safer and easier to explain to beginners.

4. **Storing git credentials in DockTerm config:** Rejected — security liability; OS credential helpers are the established pattern.

5. **Bare `--force` push exposed in UI:** Rejected — `--force-with-lease` is a strictly safer substitute and should always be preferred in a UI context.

6. **Watching `.git` directory for status triggers:** Rejected — `.git` changes during every `git status` call, creating feedback loops. Watch working-tree files only; trigger status refresh programmatically after git operations.

7. **Using `git checkout -- <file>` for discard:** Rejected — deprecated syntax, confusing error messages, conflates branch switching. Use `git restore -- <file>`.

---

## V1 Recommendations

### Summary

- **Library:** simple-git 3.36.0 via npm
- **File watcher:** chokidar with 500ms debounce, explicit excludes
- **Credential handling:** system helpers only; never store in app
- **Beginner mode:** default ON, tooltip-layer only
- **Force push:** `--force-with-lease` only, never `--force`
- **Conflict resolution:** terminal only (no in-app editor)
- **Reset/amend/revert/clean:** terminal only (omitted from V1 UI)

### Danger Matrix (V1 Summary)

| Operation | V1 UI | Confirmation required | Safe command |
|---|---|---|---|
| Discard file | YES | YES — "cannot be undone" | `git restore -- <path>` |
| Discard all | YES | YES — show file count | `git restore .` |
| Unstage file | YES | NO | `git restore --staged -- <path>` |
| Unstage all | YES | NO | `git restore --staged .` |
| Delete branch (merged) | YES | YES | `git branch -d <name>` |
| Delete branch (unmerged) | NO | — | omitted |
| Force push | YES | YES — "rewrite history" | `git push --force-with-lease` |
| Hard reset | NO | — | omitted |
| Soft/mixed reset | NO | — | omitted |
| Amend | NO | — | omitted |
| Revert | NO | — | omitted |
| Clean untracked | NO | — | omitted |
| Stash drop | NO | — | omitted |

### gitService API List (abbreviated for V1)

V1 implements all functions listed in §7 above. The full TypeScript signatures are the canonical implementation target. IPC channel naming convention: `git:<methodName>` (e.g., `ipcMain.handle('git:getStatus', ...)`).

### File Watcher Configuration (V1)

```typescript
chokidar.watch(repoRoot, {
  ignored: [
    /(^|[\/\\])\../,          // dotfiles/dotdirs (including .git)
    /node_modules/,
    /dist/,
    /build/,
    /\.next/,
    /\.nuxt/,
    /coverage/,
  ],
  ignoreInitial: true,
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
})
.on('all', debounce(() => triggerStatusRefresh(repoRoot), 500));
```

---

## Sources

- [simple-git on GitHub (steveukx/git-js)](https://github.com/steveukx/git-js)
- [simple-git TypeScript definitions](https://github.com/steveukx/git-js/blob/main/simple-git/typings/simple-git.d.ts)
- [simple-git CHANGELOG.md](https://github.com/steveukx/git-js/blob/main/simple-git/CHANGELOG.md)
- [simple-git on npm](https://www.npmjs.com/package/simple-git)
- [simple-git security (Snyk)](https://security.snyk.io/package/npm/simple-git)
- [git-status porcelain=v2 manual](https://www.kernel.org/pub/software/scm/git/docs/git-status.html)
- [porcelain=v2 nushell discussion](https://github.com/nushell/nushell/discussions/17003)
- [VS Code staging-commits docs](https://code.visualstudio.com/docs/sourcecontrol/staging-commits)
- [VS Code source control overview](https://code.visualstudio.com/docs/sourcecontrol/overview)
- [VS Code repos-remotes docs](https://code.visualstudio.com/docs/sourcecontrol/repos-remotes)
- [VS Code issue #118617 — upstream confusion](https://github.com/microsoft/vscode/issues/118617)
- [GitHub Desktop issue #13737 — "Publish Branch"](https://github.com/desktop/desktop/issues/13737)
- [GitHub Desktop issue #4591 — staging not used](https://github.com/desktop/desktop/issues/4591)
- [lazygit User Guide](https://lazygit.dev/docs/guide/)
- [lazygit files panel blog](https://oliverguenther.de/2021/04/lazygit-the-files-panel/)
- [lazygit issue #4915 — unstaged/staged splits](https://github.com/jesseduffield/lazygit/issues/4915)
- [git push --force-with-lease vs --force (DataCamp)](https://www.datacamp.com/tutorial/git-push-force)
- [force-with-lease vs force (Delft Stack)](https://www.delftstack.com/howto/git/git-push-force-with-lease/)
- [Safe force push blog](https://www.seancdavis.com/posts/git-safe-force-push/)
- [VS Code issue #3998 — chokidar CPU](https://github.com/Microsoft/vscode/issues/3998)
- [chokidar issue #447 — Mac CPU](https://github.com/paulmillr/chokidar/issues/447)
- [VS Code built-in git slowness issue #313860](https://github.com/microsoft/vscode/issues/313860)
- [Electron + chokidar integration horror story](https://www.hendrik-erz.de/post/electron-chokidar-and-native-nodejs-modules-a-horror-story-from-integration-hell)
- [Git Credential Manager releases](https://github.com/git-ecosystem/git-credential-manager/releases)
- [Node.js execFile Windows slowness #21632](https://github.com/nodejs/node/issues/21632)
