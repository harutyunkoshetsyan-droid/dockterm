# 09 — Testing & QA Strategy

**Date:** 2026-06-11
**Author:** Testing/QA Planning Agent
**Status:** Draft — planning phase, no app code exists yet

---

## Findings

### 1. Unit-Test Framework — Vitest 4

**Current version:** Vitest 4.1.x (latest stable as of June 2026; v4.1.7/4.1.8 published within the last two weeks). Vitest 5.0 is in active development for patch backports only.

Key facts relevant to DockTerm:
- Vitest 4 runs in Node.js (not a browser); main-process service files can be imported and tested directly without launching Electron.
- `vi.mock('electron')` is the canonical pattern for mocking the electron module boundary. The known footgun is hoisting: `vi.mock()` is hoisted to the top of the file by Vite's transform, so variable references captured in the factory closure must themselves be lazy (use factories that return `vi.fn()`). `vi.doMock()` avoids hoisting but requires a dynamic import of the module under test afterward — this is the cleaner pattern for main-process service tests.
- Vitest 4 added `expect.schemaMatching` which validates against Zod/Valibot schemas — useful for IPC payload validator tests.
- Browser Mode (for renderer-side React tests) is no longer experimental in Vitest 4; requires `@vitest/browser-playwright` provider. Renderer tests can run in a real Chromium via Playwright. DockTerm V1 should keep renderer tests as jsdom-based component tests to avoid setup complexity; upgrade later.

**Pattern for testing Electron main-process code without launching Electron:**

```typescript
// vitest.config.ts — main process project
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/main/**/*.test.ts'],
    setupFiles: ['test/setup-electron-mock.ts'],
  },
});

// test/setup-electron-mock.ts
import { vi } from 'vitest';
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/dockterm-test'), isPackaged: false },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    webContents: { send: vi.fn() },
    on: vi.fn(),
  })),
  dialog: { showOpenDialog: vi.fn(), showMessageBox: vi.fn() },
  shell: { openExternal: vi.fn() },
}));
```

Any service file that imports from `electron` at the top level will receive the mock. Test the service's logic in isolation: path jailing, git viewmodel mapping, IPC validators, config parsers, checkpoint logic, settings store. None of these need a real Electron runtime.

**Sources:**
- [Vitest 4.0 release blog](https://vitest.dev/blog/vitest-4) — confirmed v4.1.7 stable
- [Vitest 4.1 release blog](https://vitest.dev/blog/vitest-4-1.html)
- [GitHub issue — mocking electron with doMock vs mock](https://github.com/vitest-dev/vitest/issues/4166)
- [GitHub issue — can't mock electron API](https://github.com/vitest-dev/vitest/issues/425)

---

### 2. E2E Framework — Playwright vs WebdriverIO

#### 2a. Playwright `_electron` API

As of June 2026, Playwright's Electron support is **still labeled experimental** in official docs:

> "Playwright has experimental support for Electron automation."

The underscore prefix on `_electron` signals pre-release intentionally. Key characteristics:

- Uses Chrome DevTools Protocol (CDP) — fast, no WebDriver overhead
- Works with Electron v12.2+, v13.4+, v14+
- Entry point: `_electron.launch({ args: ['dist/main.js'] })` returns `ElectronApplication`
- Can evaluate code in the main process via `electronApp.evaluate()`
- **Cannot run Electron in true headless mode** — this is a long-standing open issue ([#13288](https://github.com/microsoft/playwright/issues/13288), [#2609](https://github.com/microsoft/playwright/issues/2609)). On Linux CI (ubuntu-latest), a virtual framebuffer is required (`xvfb-run` / `xvfb-maybe`).
- On Windows and macOS runners: no display server needed — Electron opens a real window on the runner's desktop session.
- **Electron does not appear headless** on GitHub's Windows runners because the runner has a desktop session; this is not a problem in practice.
- VS Code uses Playwright + Electron internally, which is the strongest signal of real-world viability.
- A GitHub issue opened March 2026 ([#39477](https://github.com/microsoft/playwright/issues/39477)) asks for clarification on production readiness; the fact that it's still labeled experimental after 4+ years is a legitimate concern for stability contracts but not a functional blocker.

#### 2b. WebdriverIO `@wdio/electron-service`

- Actively maintained, recently moved from `webdriverio-community` to the official WebdriverIO org; the former community package (`wdio-electron-service`) is deprecated
- Requires WebdriverIO 9.19.1+ for `autoXvfb` support (replaces the manual `xvfb-maybe` approach)
- Auto-detects Electron Forge/builder apps, auto-downloads matching Chromedriver
- Offers Electron API mocking within tests via a Vitest-like API
- **More configuration surface** than Playwright: needs `wdio.conf.ts`, service plugin wiring, separate Chromedriver binary management
- WebDriver BiDi adoption (WDIO v9) closes some speed gap, but CDP-based Playwright remains faster in practice for Electron

**Sources:**
- [Playwright Electron API docs](https://playwright.dev/docs/api/class-electron)
- [Electron automated testing docs](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Playwright headless Electron feature request #13288](https://github.com/microsoft/playwright/issues/13288)
- [Playwright Electron CI bug for ubuntu-latest #12139](https://github.com/microsoft/playwright/issues/12139)
- [wdio-electron-service docs](https://webdriver.io/docs/desktop-testing/electron/)
- [Simon Willison — testing Electron with Playwright + GitHub Actions](https://til.simonwillison.net/electron/testing-electron-playwright)

---

### 3. node-pty in CI

- **node-pty is a native module** — it must be rebuilt against the target Electron ABI via `@electron/rebuild` after `npm ci`
- Windows: uses ConPTY (Windows 1809+, build 18309+). GitHub's `windows-latest` runner is Windows Server 2022 (build 20348) — ConPTY is available.
- Known issue (Nov 2024): node-pty 1.0.0 fails to compile against Electron 33.2.0 due to a GCC/C++20 flag mismatch (`-std=gnu++20` not recognized by older GCC). The fix is using a newer GCC or pre-built binaries. Monitor this against the Electron version chosen for DockTerm — pin to a verified-compatible pair.
- macOS: node-pty builds cleanly on `macos-latest` runners with standard Xcode toolchain
- Windows `@electron/rebuild` failure for node-pty is a documented ongoing pain point ([electron/rebuild#269](https://github.com/electron/rebuild/issues/269)) — must be verified during initial project setup, not deferred

**node-pty in E2E tests:** Even on headed CI runs, spawning a PTY works on Windows runners. The concern is that output timing from a PTY differs from synchronous Node streams — E2E tests that assert terminal text need generous `waitForSelector` timeouts (5–10 s), not the 30-second default Playwright Electron timeout which is too short for some operations but is the ceiling not the floor.

**Sources:**
- [node-pty GitHub — compatibility issue #728](https://github.com/microsoft/node-pty/issues/728)
- [electron/rebuild#269 — node-pty rebuild failure](https://github.com/electron/rebuild/issues/269)
- [ConPTY DeepWiki](https://deepwiki.com/microsoft/node-pty/4.4-conpty-integration)
- [GitHub Actions windows-latest image](https://github.com/vercel/ncc/issues/1309)

---

### 4. Real-git Integration Tests on Windows

Creating temp repos in tests works on Windows with these patterns:

- Use `os.tmpdir()` + a unique subdirectory (e.g. `path.join(os.tmpdir(), 'dockterm-test-' + crypto.randomUUID())`)
- Run `git init`, `git config user.email`, `git config user.name` explicitly for each temp repo — git inherits from `~/.gitconfig` only if it trusts the directory, and on Windows `safe.directory` rules can block the test user from owning temp paths created by a different account
- **CRLF pitfall:** git on Windows defaults to `core.autocrlf=true` — set `core.autocrlf=false` in the temp repo's local config to get predictable LF line endings in test fixture files
- **File-locking pitfall:** Windows holds file handles longer than POSIX; `rmSync` in `afterEach` frequently throws `EBUSY` or `EPERM` if git's index lock file or object pack is still open. Workarounds: use `rimraf` with retries, or use Vitest's `--pool=forks` to isolate each test file in a separate subprocess so cleanup races don't cascade; alternatively, collect temp dir paths in a global and defer cleanup to `afterAll`
- **Antivirus:** Windows Defender on GitHub runners can hold `.git/index` briefly during scanning. The practical fix is a retry loop (3 attempts, 100ms apart) around cleanup
- **Bare repo as remote:** Create a second temp dir, `git init --bare`, then in the test repo `git remote add origin <bare-path>` using a file:// URL or a Windows absolute path (both work). Allows testing push, pull, publish-branch, and no-upstream flows without a network

---

## Risks

| # | Risk | Severity | Likelihood |
|---|------|----------|------------|
| R1 | Playwright Electron stays "experimental" indefinitely; breaking API change forces migration | Medium | Low — VS Code dependency makes breakage unlikely |
| R2 | node-pty rebuild fails on CI for a new Electron version (C++ standard mismatch) | High | Medium — happened with Electron 33 in late 2024 |
| R3 | Windows temp-dir cleanup flakiness causes intermittent git integration test failures | Medium | High — well-known Windows issue |
| R4 | Electron E2E on ubuntu-latest fails without xvfb wiring | High | High — documented bug; must add xvfb-run |
| R5 | IPC mock diverges from real electron module shape; mocked tests pass but real app crashes | High | Medium — requires discipline in mock maintenance |
| R6 | node-pty ConPTY assertion-failure crash on CI (seen in openai/codex) | Medium | Low-Medium — specific to certain PTY operations |

---

## Decisions (Recommended)

### D1 — Unit test framework: Vitest 4 (Node environment)
Vitest 4.x running in `environment: 'node'` for all main-process service unit tests. Mock the `electron` module boundary via a global `vi.mock('electron', ...)` setup file. Do NOT use Vitest's browser mode for V1 — it adds Playwright dependency duplication and setup complexity without clear benefit at this stage.

### D2 — Renderer component tests: Vitest 4 with jsdom
React component unit tests (including xterm.js React wrapper, Monaco wrapper, git panel list rendering) run with `environment: 'jsdom'`. Use `@testing-library/react`. Exclude tests that require actual terminal I/O from the component layer.

### D3 — E2E framework: Playwright `_electron` (accept the experimental label)
The "experimental" label is a documentation artifact; the API has been stable for 4+ years and is used by VS Code. Playwright's simpler DX (no separate Chromedriver, first-class TypeScript, parallel tests, video recording) outweighs WebdriverIO's added configuration. Accept the risk with a fallback plan: if Playwright breaks in a major Electron update, add a V1.x manual checklist to cover E2E gaps.

**Linux CI requirement:** add `xvfb-run` wrapping. Windows and macOS runners need no special display setup.

### D4 — E2E scope for V1 CI: minimal smoke test only
V1 CI runs a single Playwright Electron smoke test: launch app, verify window title, verify terminal xterm.js canvas renders, close. Full multi-panel E2E is gated behind a `[e2e:full]` label and runs on demand only — not on every PR. Rationale: node-pty + xterm I/O timing makes terminal E2E inherently slow and flaky without significant investment.

### D5 — Git integration tests: use temp repos with explicit config
Use the patterns above: local bare repo as remote, explicit `core.autocrlf=false`, retry-based cleanup, `--pool=forks` for test isolation on Windows.

### D6 — Native rebuild step in CI
Add `npx @electron/rebuild` as an explicit CI step after `npm ci`, before any test that loads the actual Electron app. For unit tests that mock electron, native rebuild is not required (they run in plain Node).

---

## Rejected Ideas

| Idea | Reason for Rejection |
|------|---------------------|
| Use Jest instead of Vitest | DockTerm uses Vite; Vitest integrates natively and shares the same transform pipeline. Jest requires separate Babel/SWC transform config with no benefit |
| Use WebdriverIO for E2E | More configuration overhead (wdio.conf, Chromedriver), WebDriver protocol round-trips are slower, and the WDIO mocking API for Electron adds a second mock layer on top of the unit test mocks |
| Run full E2E on every PR in CI | node-pty PTY output timing and Electron window lifecycle make full E2E tests inherently slow (30–120s) and prone to flakiness; a minimal smoke test is the right boundary for V1 |
| Use Vitest Browser Mode for renderer tests | Requires `@vitest/browser-playwright` and a separate Playwright install; jsdom covers all V1 component test needs without adding a browser context |
| Headless Electron | Not supported by Electron/Chromium architecture; no API exists to suppress window creation. Not viable. |
| Use `electron-mock-ipc` library | Last meaningfully updated 2022; Vitest's native `vi.fn()` + a typed mock of ipcMain/ipcRenderer covers the same surface with less dependency risk |

---

## V1 Recommendations

### Test Plan (What to Unit Test)

#### 1. Path-Jail Logic (`src/main/services/pathJail.ts`)

- Happy path: resolve `workspace/src/index.ts` → stays within jail
- Traversal: `../../etc/passwd` → throws or returns null
- Symlink escape: symlink inside workspace pointing outside → blocked (requires `fs.realpathSync` check)
- Windows case-insensitivity: `C:\Workspace\FILE.TS` vs `c:\workspace\file.ts` → treated as same file, not a bypass
- UNC path: `\\server\share\file` → not within jail, rejected
- Empty string / null input → graceful error
- Exact boundary: root of workspace itself → allowed

#### 2. Git Status → UI ViewModel Mapping (`src/main/services/gitViewModel.ts`)

- Clean working tree → empty staged/unstaged arrays
- Modified tracked file → appears in unstaged
- Staged file → appears in staged, not unstaged
- Untracked file → appears in untracked
- Conflict markers → `conflicted: true` on file entry
- Binary file with modification → ViewModel shows `binary: true`, no diff preview
- 500-file diff → ViewModel truncates to first 100, sets `truncated: true`
- Detached HEAD → `branch: null`, `detached: true`
- No commits yet (empty repo) → `noCommits: true`

#### 3. MCP/Skills Config Parsers (`src/main/services/configParser.ts`)

Fixture files live in `test/fixtures/config/`:

- `mcp-valid.json` — well-formed MCP config with 3 servers → parses to expected shape
- `mcp-malformed.json` — unclosed brace → returns `ParseError` with line hint, does not throw
- `mcp-huge.json` — 10,000 lines, 1 MB → parses within 500 ms (performance assertion)
- `mcp-secret.json` — contains API keys in server args → masked values (regex: anything matching `sk-`, `ghp_`, `xoxb-`, 32+ hex chars) become `"***"` in ViewModel; original value NOT logged
- `skills-valid.json` — well-formed skills array → parsed correctly
- `skills-missing-fields.json` — skill object lacks `name` → skipped/error, others parse
- File does not exist → returns empty config, no crash
- File is empty → returns empty config
- File contains JSON5 / trailing commas → rejected with clear error (not silently corrupt)

#### 4. Checkpoint Logic (`src/main/services/checkpoint.ts`)

- Checkpoint created on file-save → snapshot has correct file hash, timestamp
- Checkpoint list is chronological
- Restore from checkpoint → file content matches snapshot
- Restore past the current save → does not overwrite current
- Max checkpoint count (e.g. 50) → oldest evicted when limit reached
- Corrupt checkpoint store → checkpoint service degrades gracefully, does not break editor save
- Concurrent saves (two rapid saves within 50 ms) → no race condition on checkpoint write

#### 5. Settings Store (`src/main/services/settingsStore.ts`)

- Default settings returned when no file exists
- Settings persisted atomically: write must go to temp file then rename (verify `write-file-atomic` pattern or equivalent)
- Corrupt JSON in settings file → defaults returned, corrupt file optionally backed up
- Partial settings (only some keys present) → defaults merged for missing keys
- Settings validated against schema → unknown keys stripped, invalid types rejected
- Concurrent write (two overlapping setters) → last write wins, no partial-write corruption

#### 6. IPC Payload Validators (`src/main/ipc/validators.ts`)

Test each channel's validator with:
- Valid payload → passes (returns typed value)
- Missing required field → throws `IpcValidationError`
- Wrong type (string where number expected) → throws
- Extra unknown fields → stripped (strict mode) or ignored (passthrough) — document which
- Null payload → throws
- Oversized payload (> 1 MB string field) → throws with size error

### Manual QA Checklist (~40 Items)

#### Terminal (12 items)
1. Shell spawns on app open; prompt appears in < 2 s
2. `echo hello` produces output; exit code 0 shown (or not — consistent)
3. Terminal resize: drag window corner → PTY SIGWINCH fires → `stty size` in shell reflects new dimensions
4. Paste multiline text (5 lines, e.g. a bash function) → all lines received intact, no line dropped
5. Unicode/CJK: `echo "日本語テスト"` → renders correctly, not garbled
6. Emoji: `echo "🚀"` → renders or gracefully degrades (no crash, no mojibake)
7. High-throughput output: `cat /dev/urandom | head -c 10MB | xxd` (or Windows equivalent) → xterm.js scrollback functions, app does not hang, UI stays responsive
8. Claude Code TUI (`claude` command): interactive TUI renders, arrow keys work, Ctrl+C exits cleanly
9. Kill shell: click "Kill" (or close shell tab) → shell process terminated, no zombie
10. Restart shell: after kill, "New Terminal" button opens fresh shell
11. Shell selection: if configurable, switching shell (e.g. PowerShell → Git Bash) → new shell spawns with selected binary
12. Ctrl+C in running process → sends SIGINT; `ping` or `sleep 100` stops

#### Editor (8 items)
13. Open file → content loads in Monaco
14. Edit file → dirty indicator (dot on tab or asterisk in title) appears
15. Save (Ctrl+S) → dirty indicator clears; file on disk has new content
16. External change: edit file in Notepad while open in DockTerm → conflict prompt appears ("reload from disk?" or auto-reload with notification)
17. Binary file: open `.png` → editor declines gracefully ("binary file not supported") rather than showing garbage
18. Huge file: open a 10 MB `.log` file → editor opens (possibly with warning) rather than freezing
19. Save shortcut works without focus requiring a click first (shortcut captured globally within editor pane)
20. Unsaved changes on close/reload → prompt to save or discard

#### Git Panel (10 items)
21. Open a repo with staged + unstaged changes → both lists populated correctly
22. Stage a file via "+" button → file moves from unstaged to staged list; diff shown
23. Unstage a file → moves back
24. Commit with message → commit appears in log, staged list clears
25. Empty commit message → blocked with validation message, not silent fail
26. Zero-commit repo (fresh `git init`, no commits) → panel shows "no commits yet", no crash
27. No-remote repo → push button disabled or shows "no remote configured"
28. No-upstream branch (local branch only) → push button shows "Publish branch" flow, not silent fail or crash
29. Pull → fetches from remote, fast-forward shown
30. Conflict banner: create a merge conflict scenario → banner or indicator visible; merge tool (or diff view) accessible

#### MCP/Skills Panels (5 items)
31. MCP panel: loads `~/.claude/mcp.json` (or configured path) → servers listed
32. Secret values in MCP config → masked in UI (`***` or redacted), not shown in plain text
33. Missing config file → panel shows "config not found" state, not blank or errored
34. Malformed config file → panel shows parse error with file path, not blank
35. Skills panel: loads local skills directory → skill names listed with descriptions

#### Application / Cross-Feature (8 items)
36. Command palette (Ctrl+Shift+P or similar) → opens, filters, executes an action
37. Settings UI: change a setting → persisted after restart
38. Window resize and restore: maximize, restore, minimize → window state persists across restart if configured
39. Second instance: launch DockTerm when one is already running → either focuses existing window or opens second (per design); does NOT crash
40. All panel toggle buttons: each button in the toolbar/sidebar produces a visible effect (panel shows/hides); none silently no-ops
41. Keyboard shortcuts documented in settings/help panel match actual behavior
42. Error toast: trigger a known error (e.g. try to open a file that doesn't exist via API) → error toast appears, disappears after timeout

### CI Sketch — GitHub Actions Matrix

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:

jobs:
  ci:
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest]
        node: ['22']    # Node 22 LTS; Node 20 EOL April 2026

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # node-pty is a native module — must be rebuilt against Electron's Node ABI
      # before any step that imports the actual app (E2E smoke test).
      # Unit tests that mock electron do NOT need this step.
      - name: Rebuild native modules
        run: npx @electron/rebuild
        # Note: this step requires Visual Studio Build Tools on windows-latest
        # and Xcode CLI on macos-latest — both are pre-installed on GitHub runners.

      - name: Type check
        run: npm run typecheck

      - name: Unit tests (main process)
        run: npm run test:unit
        # Runs Vitest in --pool=forks on Windows to avoid file-lock races in git integration tests

      - name: Unit tests (renderer)
        run: npm run test:renderer
        # Runs Vitest with jsdom environment

      # Linux-only: E2E requires xvfb for Electron window
      # On windows-latest and macos-latest: no xvfb needed
      - name: E2E smoke test (Windows/macOS)
        if: runner.os != 'Linux'
        run: npm run test:e2e:smoke
        timeout-minutes: 5

      - name: Build (unsigned)
        run: npm run build
        # Produces dist/ artifacts; packaging (electron-builder) is a separate release job

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dockterm-${{ matrix.os }}-${{ github.sha }}
          path: dist/
          retention-days: 7
```

**CI Decisions and Rationale:**

- **Node 22 only:** Node 20 is EOL April 2026 per GitHub changelog. Node 22 is the current LTS.
- **No ubuntu-latest in V1 matrix:** Electron on Linux requires xvfb, which works but adds complexity. V1 targets Windows 11 and macOS primarily; Linux CI can be added in V1.1 once the app is stable.
- **`npm ci` not `npm install`:** Ensures lockfile-exact installs; required for reproducible native builds.
- **`@electron/rebuild` before E2E, not before unit tests:** Unit tests mock the electron module; only E2E actually loads the packaged app with node-pty. Separating the steps lets unit tests run faster if rebuild fails (separate failure signal).
- **`--pool=forks` for git integration tests:** Vitest's default thread pool can cause Windows file-lock races when multiple tests create temp git repos concurrently. Fork pool gives each test file an isolated process.
- **Timeout 5 minutes for E2E smoke:** Playwright Electron launch + node-pty warm-up can take 30–60 s on cold runners; 5 minutes is generous but bounded.
- **Unsigned artifacts:** Code signing (Apple notarization, Windows Authenticode) is a release concern, not a CI concern.
- **What V1 CI should NOT attempt:** Full multi-panel E2E, cross-platform packaging (MSI/DMG), auto-update smoke tests, or load tests. These belong to a release pipeline, not PR CI.

### "No Fake UI" Audit Procedure

The goal is to catch every button, menu item, or interactive control that has no real effect — emitting only `console.log` or doing nothing.

**Step 1 — Static grep sweep (run before every release)**

```bash
# Find onClick handlers that only console.log
grep -rn "onClick.*console\." src/renderer --include="*.tsx"

# Find empty onClick handlers
grep -rn "onClick={() => {}}" src/renderer --include="*.tsx"
grep -rn "onClick={noop}" src/renderer --include="*.tsx"

# Find TODO/placeholder handlers
grep -rn "TODO\|FIXME\|placeholder\|not implemented" src/renderer --include="*.tsx"

# Find buttons without onClick (may be intentionally disabled — verify each)
grep -rn "<Button" src/renderer --include="*.tsx" | grep -v "onClick"
```

**Step 2 — IPC handler completeness check**

Every `ipcRenderer.invoke('channel-name', ...)` call in the renderer must have a corresponding `ipcMain.handle('channel-name', ...)` in main. Generate both lists and diff:

```bash
# Renderer: all IPC channels invoked
grep -rn "ipcRenderer.invoke\|ipcRenderer.send" src/renderer --include="*.ts" -o | \
  grep -oP "'[^']+'" | sort -u > /tmp/renderer-channels.txt

# Main: all IPC channels handled
grep -rn "ipcMain.handle\|ipcMain.on" src/main --include="*.ts" -o | \
  grep -oP "'[^']+'" | sort -u > /tmp/main-channels.txt

diff /tmp/renderer-channels.txt /tmp/main-channels.txt
```

Any channel in renderer but not in main is a dead call. Any channel in main but not in renderer is a dead handler. Both must be zero at release.

**Step 3 — Pre-release click-through session (manual)**

Assign one engineer 2 hours to walk through the manual QA checklist above, specifically marking every interactive control with one of:
- WIRED — took a real effect
- BROKEN — visible error or wrong behavior
- DEAD — no visible effect

All DEAD items block release. The session should be screen-recorded for the release notes.

**Step 4 — Add to PR template**

```markdown
## UI audit checklist
- [ ] No new `onClick` handlers that only `console.log`
- [ ] Any new IPC channel has both a renderer invocation and a main handler
- [ ] New buttons/controls included in manual QA checklist if not covered by automated tests
```

---

## Summary of Cited Sources

- [Playwright Electron API — experimental status](https://playwright.dev/docs/api/class-electron)
- [Playwright ElectronApplication API](https://playwright.dev/docs/api/class-electronapplication)
- [Playwright feature request — headless Electron #13288](https://github.com/microsoft/playwright/issues/13288)
- [Playwright Electron CI bug ubuntu-latest #12139](https://github.com/microsoft/playwright/issues/12139)
- [Playwright Electron experimental question #39477](https://github.com/microsoft/playwright/issues/39477)
- [Playwright headless Electron question #2609](https://github.com/microsoft/playwright/issues/2609)
- [Electron automated testing docs](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Electron headless CI docs](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci)
- [Vitest 4.0 blog](https://vitest.dev/blog/vitest-4)
- [Vitest 4.1 blog](https://vitest.dev/blog/vitest-4-1.html)
- [Vitest releases](https://github.com/vitest-dev/vitest/releases)
- [Vitest electron mock issue #4166](https://github.com/vitest-dev/vitest/issues/4166)
- [Vitest electron mock issue #425](https://github.com/vitest-dev/vitest/issues/425)
- [node-pty GitHub](https://github.com/microsoft/node-PTY)
- [node-pty Electron compatibility issue #728](https://github.com/microsoft/node-pty/issues/728)
- [electron/rebuild#269 — node-pty rebuild failure](https://github.com/electron/rebuild/issues/269)
- [ConPTY integration DeepWiki](https://deepwiki.com/microsoft/node-pty/4.4-conpty-integration)
- [WebdriverIO Electron service docs](https://webdriver.io/docs/desktop-testing/electron/)
- [wdio-electron-service GitHub](https://github.com/webdriverio-community/wdio-electron-service)
- [Simon Willison TIL — Playwright Electron GitHub Actions](https://til.simonwillison.net/electron/testing-electron-playwright)
- [electron/rebuild — native module rebuild](https://github.com/electron/rebuild)
- [GitHub Actions Node 20 deprecation](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/)
- [electron-mock-ipc](https://github.com/h3poteto/electron-mock-ipc)
- [Electron Forge + node-pty guide](https://thomasdeegan.medium.com/electron-forge-node-pty-9dd18d948956)
