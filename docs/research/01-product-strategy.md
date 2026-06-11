# DockTerm Product Strategy Report
**Date:** 2026-06-11  
**Author:** Product Strategy Agent  
**Status:** Pre-build planning — no app code exists

---

## Findings

### 1. Positioning: Is the Pain Real?

**The core pain hypothesis:** "I run Claude Code in a terminal, but I keep switching to VS Code/Cursor just to see files, diffs, and Git state."

**Evidence: Pain is real, but more nuanced than originally framed.**

The pain is real and documented across multiple sources, but the specific flavor has evolved by 2026. Original pain (2024–early 2025) was pure context-switching: run `claude` in terminal, alt-tab to VS Code to see what changed, alt-tab back. By mid-2026, the pain has fragmented into specific sub-pains:

- **Multi-session orchestration overhead:** "Keeping track of what each session is doing, which ones need input, and what changed across all of them is manual bookkeeping." ([XDA Developers](https://www.xda-developers.com/vs-code-terminal-agents-editor-workflow/))
- **Large-diff illegibility:** "Reading diffs in the terminal works for small changes but not for a 40-file migration." ([MindStudio](https://www.mindstudio.ai/blog/claude-desktop-app-vs-terminal-agentic-work))
- **Git branch context loss:** A DEV Community post with significant engagement documented building a git-hook workaround because "Claude Code is still referencing the old CLAUDE.md from the previous branch" after switching branches. ([DEV Community](https://dev.to/davidcreador/i-was-losing-my-mind-switching-branches-with-claude-code-so-i-built-this-5e5f))
- **Checkpoint confusion:** Developers understand Claude Code has checkpoint/rewind functionality but struggle to use it in a pure-terminal interface. ([Hacker News checkpoints thread](https://news.ycombinator.com/item?id=45050090))
- **MCP config friction:** MCP server management is CLI-only in most workflows; there is no visual management short of using the VS Code extension.

**Conclusion:** The pain is genuine and actively discussed in 2025–2026. The specific wedge — a standalone, non-IDE, terminal-native workspace with visual side panels — remains underserved by current tools. The framing should be refined from "I have to switch to VS Code" to "my Claude Code workflow is scattered across 3+ windows and I lose state between them."

**Revised one-paragraph positioning:**

DockTerm is the missing home for Claude Code — a lightweight, open-source desktop workspace that wraps a real terminal (where you run `claude` yourself) with the visual context panels that terminal-only workflows lack: a live file tree, a Monaco diff/review panel with checkpoint integration, a beginner-safe Git panel, and MCP/skills management. It is not an IDE; it is a terminal workspace. It does not call the AI; you do. It just makes everything you need to review, understand, and commit Claude's work available at a glance, without opening VS Code.

**One-line:** DockTerm: the terminal workspace Claude Code always assumed you had.

---

### 2. Competitive Landscape (Current as of 2026-06-11)

This is the most critical section — the landscape changed dramatically in 2025–2026.

#### Threat 1: Anthropic's Own Claude Code Desktop App (HIGH THREAT)
Anthropic launched and then **redesigned** the Claude Code desktop app with an integrated terminal, drag-and-drop panes, a rebuilt diff viewer, a lightweight file editor, session sidebar, and side-chat panel. ([Anthropic blog post](https://claude.com/blog/claude-code-desktop-redesign)) ([VentureBeat coverage](https://venturebeat.com/orchestration/we-tested-anthropics-redesigned-claude-code-desktop-app-and-routines-heres-what-enterprises-should-know/))

**What it has:** Integrated terminal, file editor, diff viewer, preview pane, session sidebar, drag-and-drop panes.  
**What it lacks:** Dedicated Git panel, file tree, MCP config panel, beginner-safe Git UI, checkpoint visual integration, open-source/local-first guarantee.  
**Key weakness:** Tied to Anthropic subscriptions (Pro/Max/Team/Enterprise only). Not open-source. Positions the user as a passive observer of multiple agent sessions rather than as a terminal-first developer who runs `claude` themselves.

#### Threat 2: Anthropic's Claude Code VS Code Extension (MEDIUM THREAT)
A mature, first-party VS Code extension that provides inline diffs, plan review, checkpoint rewind UI, MCP server partial management, and session history. ([Official docs](https://code.claude.com/docs/en/vs-code))

**Key weakness:** Requires VS Code. Developers who deliberately avoid VS Code (Neovim users, minimalists, those on expensive Cursor alternatives) are not served. It also brings all of VS Code with it — 300MB+ binary, language servers, extensions — which is the bloat DockTerm explicitly avoids.

#### Threat 3: Warp Terminal (HIGH THREAT — strongest competitive signal)
Warp has pivoted aggressively into the Claude Code workspace space. As of 2026, Warp includes:
- File tree explorer for browsing and adding files as agent context
- Code review panel with inline diff viewing against current branch or main
- Tabbed file viewing with syntax highlighting and native editing
- Agent session management with vertical tabs, metadata (git branch, PR status)
- Notification center for agent attention requests
- MCP server integration via slash commands
- Open-sourced its terminal client in April 2026 under AGPL-3.0/MIT ([FOSS Force](https://fossforce.com/2026/05/after-years-of-teasing-warp-finally-goes-open-source/))
- Free tier: 75–150 AI credits/month; $0 for terminal features ([Warp pricing](https://www.warp.dev/pricing))

**Warp's key weaknesses:** The Oz cloud orchestration platform is still proprietary/closed. Warp's identity is fundamentally "smart terminal" — it replaces your shell workflow and adds AI inline. DockTerm's identity is "Claude Code companion" — it never replaces the terminal or the shell, it just adds visual panels alongside. Warp also has 62k+ stars and commercial backing, making it hard to out-feature.

**Survival insight:** DockTerm must win on identity clarity, not features. If DockTerm tries to replicate Warp's feature set, Warp wins. DockTerm wins by being the pure Claude Code companion — minimal, opinionated, open-source, not trying to reinvent the terminal itself.

#### Threat 4: Community Projects (LOW-MEDIUM THREAT)
Multiple Electron/Tauri Claude Code wrappers exist on GitHub:
- `markes76/claude-code-gui` — comprehensive GUI wrapper ([GitHub](https://github.com/markes76/claude-code-gui))
- `Mr8BitHK/claude-terminal` — tabbed terminal manager for Windows ([GitHub](https://github.com/Mr8BitHK/claude-terminal))
- `paulallington/Claudes` — multi-column terminal layout ([GitHub](https://github.com/paulallington/Claudes))
- `tony1223/better-agent-terminal` — Tauri-based multi-workspace terminal ([GitHub](https://github.com/tony1223/better-agent-terminal))
- `Sterll/claude-terminal` — cross-platform with git workflows and plugin management ([GitHub](https://github.com/Sterll/claude-terminal))

None of these appear to have meaningful star counts or sustained maintenance. None integrate the full panel suite DockTerm proposes. They validate that demand exists; their low traction validates that execution and design quality matters enormously.

---

### 3. Viral Hook: The 20-Second Demo Moment

**Three candidate hooks:**

**Hook A — The Diff-to-Commit arc (recommended):**
User runs `claude` in the DockTerm terminal, asks it to refactor a module. As Claude works, the file tree lights up with changed-file indicators in real time. User clicks one file: a full Monaco diff opens in the side panel. User scrolls through all changed files in a list, approves the change, clicks "Commit" in the Git panel — which shows a pre-filled commit message and staged diff — and confirms. Total: ~15 seconds. Zero window switching.

**Hook B — The Checkpoint rescue:**
User types `/rewind` into the terminal. The DockTerm checkpoint panel shows a visual timeline of all session states with file-change counts. User clicks a prior checkpoint, a side-by-side diff appears showing "before" vs "current." One click restores. Immediately legible to any developer who has ever lost work.

**Hook C — The MCP one-click:**
DockTerm MCP panel shows installed MCP servers as cards with a green/red status dot. User clicks "+ Add," pastes a URL, and a new card appears. The terminal shows `claude mcp add` running automatically. Addresses a real but smaller pain point; less visually dramatic.

**Recommended hook: Hook A (Diff-to-Commit arc).** It demonstrates the entire DockTerm value proposition in one continuous gesture, it requires zero narration, and it resolves an outcome (shipped commit) rather than just showing a feature. It is inherently shareable as a 15-second GIF.

---

### 4. Anti-Bloat Principles (Hard Product Rules)

1. **The terminal is sovereign.** The main terminal panel must occupy no less than 40% of the app's usable area in any layout. It can never be collapsed to a sliver. If a user wants full-screen terminal, they should use their system terminal instead.

2. **No language intelligence.** No LSP, no IntelliSense, no inline completions in Monaco, no hover docs, no go-to-definition. Monaco in DockTerm is a diff viewer and a read/spot-edit tool, not an editor. Turn off every Monaco feature that implies "IDE."

3. **No extensions in V1.** No plugin system, no marketplace, no configuration hooks for third-party panels. One person's "useful extension" is everyone else's abandoned ecosystem. Add what V1 needs; add nothing else.

4. **No AI API calls from DockTerm.** DockTerm never calls Anthropic or any AI API. It has no API key input, no model selector, no token counter. The AI lives in the terminal session the user opened. If a feature requires calling an AI, it belongs in Claude Code, not DockTerm.

5. **No accounts, no network, no telemetry — ever.** DockTerm is 100% local. No sign-in screen, no phone-home, no analytics SDK, no crash reporter that uploads anything. The settings file is a local JSON. This is a hard technical and contractual constraint, not just a V1 limitation.

---

### 5. V1 Scope: MoSCoW

#### Must Have (V1 ships with these or it doesn't ship)

| Feature | Rationale |
|---|---|
| **Main terminal (xterm.js + node-pty)** | The core product. Without a real terminal, DockTerm is just a file manager. |
| **File tree panel** | Essential context. Lights up changed files. The lowest-effort, highest-value visual. |
| **Monaco diff/review panel** | The viral moment. Shows diffs of Claude's changes. Read-only by default; allows spot edits. |
| **Git panel (beginner-safe)** | Stage, commit, push. Show current branch and status. No merge conflict resolution in V1. |
| **Checkpoint visualizer** | Shows Claude Code session checkpoint timeline with file-change counts. Links to diff panel. |
| **Command palette** | Power-user discoverability. Essential for a keyboard-first audience. |
| **Settings panel (local JSON)** | Theme, layout persistence, keybindings. Must exist before public launch. |
| **Windows 11 + macOS parity** | Dev machine is Windows; macOS is equal target. CI must build and test both from day one. |

#### Should Have (Strong for V1, can slip to V1.1 if needed)

| Feature | Rationale |
|---|---|
| **Bottom mini-terminal** | Quick shell commands without losing main terminal state. Highly requested pattern in community projects. Can ship as a smaller second xterm.js instance. |
| **Project info panel** | Shows CLAUDE.md, active branch, recent commits. Low implementation cost, high cognitive value. |
| **MCP servers panel** | Visual list of configured MCP servers with status. Edit and restart without touching JSON directly. Important for the target audience. |

#### Could Have (V1.2+)

| Feature | Rationale |
|---|---|
| **Skills/commands panel** | Visual browser for Claude Code skills and slash commands. Useful but not blocking any core workflow. |
| **Multi-session / worktree support** | Running multiple Claude Code sessions in parallel tabs. High engineering cost; Warp already does this. Defer until V1 core is stable. |
| **Dark/light theme variants beyond default** | Nice to have. Not a reason to delay launch. |

#### Won't Have (Explicitly cut, never in scope)

| Feature | Rationale |
|---|---|
| **LSP / IntelliSense** | Violates anti-bloat rule #2. Makes DockTerm an IDE. |
| **Extension system** | Violates anti-bloat rule #3. |
| **AI API calls / model selector** | Violates anti-bloat rule #4. |
| **Accounts / cloud sync / telemetry** | Violates anti-bloat rule #5. |
| **Merge conflict UI** | Too complex; scope creep toward IDE. Use git CLI in the terminal. |
| **Integrated browser preview pane** | Anthropic's desktop app already has this. Not a differentiator. |
| **Mobile companion** | Not V1. Not a desktop app concern. |
| **Built-in AI code review** | Violates rule #4. Claude Code already does `/code-review`. |

**Scope flags and simplifications for V1:**

- **Git panel:** Scope strictly to stage/commit/push/branch-display. No PR creation UI (too many hosting permutations). No merge/rebase UI. The goal is "beginner-safe commit workflow," not a full Git client.
- **MCP panel:** Should display and allow toggling of existing MCP servers from `~/.claude/settings.json`. It should NOT be a full MCP server installer in V1 — that's a significant UX surface with many edge cases.
- **Checkpoint visualizer:** This may need to read Claude Code's internal session data from `~/.claude/`. Verify the data format is stable and accessible before committing to this in V1. If the format is undocumented/unstable, simplify to a "checkpoint-aware diff" that just shows `git diff` against a user-selected commit hash, which achieves the same UX goal more robustly.

---

### 6. Success Metrics for OSS Launch

#### Star/Traffic Proxies (no telemetry)

- **GitHub stars:** 500 in first week is a strong signal; 2,000 in 30 days indicates organic spread. Baseline for comparable Claude Code wrapper tools: most community projects stay under 200 stars. A well-executed demo GIF on Twitter/X and Hacker News "Show HN" is the primary acquisition channel.
- **GitHub traffic → Unique Cloner Ratio:** High views-to-cloners ratio (>10:1) indicates demo appeal but adoption friction; indicates onboarding needs work. Low ratio (<5:1) with high absolute clones indicates strong intent.
- **Issues quality signal:** The ratio of "bug reports" vs "feature requests" vs "I got it working on X platform" posts is a leading indicator of product-market fit. A healthy ratio is roughly 1:2:1. A bug-heavy issue tracker means stability problems are blocking adoption.
- **Discussion engagement on "Show HN" post:** HN comment count and upvote pattern on launch day. A post that reaches front page and generates 50+ substantive comments (not just "nice project") is a strong signal.
- **Fork rate:** Active forks (with recent commits) indicate developers want to extend DockTerm — a sign that the architecture is approachable.

#### Retention Proxies

- **Return GitHub traffic:** GitHub Insights traffic graph: if week-2 unique visitors are >30% of launch-week visitors, there is return interest.
- **Discord/GitHub Discussions activity:** 30-day active participants in community is more meaningful than join count.
- **npm/release download counts:** Track tagged release download counts via GitHub releases API. Sustained week-over-week growth vs. front-page spike-and-decay pattern.

---

## Risks

### Failure Mode 1: Anthropic Completes the Desktop App (HIGHEST PROBABILITY)

**Evidence:** Anthropic's redesigned Claude Code desktop app already has an integrated terminal, diff viewer, and file editor. It lacks a Git panel, file tree, and MCP config panel — but those are obvious next additions on a product that is actively being developed by a well-funded team. The VS Code extension has checkpoints and MCP management. The trajectory is clear: Anthropic is building exactly what DockTerm proposes, with native Claude integration and subscription lock-in.

**Mitigation:** DockTerm's moat is open-source, local-first, no account required, and terminal-sovereign (the terminal is the hero, not the chat panel). If Anthropic ships a complete open-source version, DockTerm's thesis collapses. This is a real risk that should be accepted consciously, not denied.

**Probability:** High within 12 months.

### Failure Mode 2: Warp Becomes the De Facto Standard (HIGH PROBABILITY)

**Evidence:** Warp has 62k+ GitHub stars, open-sourced in April 2026, has a file tree, code review panel, diff viewer, and agent management. Its free tier is $0 for terminal features. It is actively marketed as "the Claude Code terminal." ([Warp agents page](https://www.warp.dev/agents/claude-code))

**Key distinction:** Warp is a terminal *replacement* — it replaces bash/zsh, has its own block-based UI, and requires buying into the Warp shell experience. DockTerm wraps your existing terminal and does not alter the shell experience. This is a real differentiation for users who run fish/zsh/bash exactly as they like it.

**Mitigation:** DockTerm must emphasize "your terminal, your shell, just with visual panels" in all messaging. Do not try to compete on raw feature count with Warp.

**Probability:** Warp likely captures mainstream market; DockTerm can own the "I don't want my terminal replaced" segment.

### Failure Mode 3: The Target Audience Is Smaller Than Estimated (MEDIUM PROBABILITY)

**Evidence:** The Claude Code VS Code extension is officially recommended by Anthropic and covers the diff review, checkpoint, and MCP management use cases for VS Code users. The addressable market for DockTerm is specifically: developers who (a) run Claude Code, (b) do NOT want VS Code, (c) do NOT want to switch their terminal to Warp, and (d) are not satisfied with the Anthropic desktop app. This intersection may be smaller than the initial pain framing suggests.

**Mitigation:** Target the audience that makes this their primary tool, not a side panel inside another tool. The "open source + no account" angle broadens the addressable market, especially in enterprise environments with data-handling restrictions.

---

## Decisions (Recommended)

1. **Ship V1 as a focused, beautiful diff-review + commit workflow tool.** The entire V1 value proposition is: open DockTerm, run `claude` in the terminal, see what changed, review it, commit it. Everything else is secondary to making that arc flawless.

2. **Lead with open-source and local-first in all messaging.** This is the only permanent competitive advantage over Anthropic's desktop app and Warp. Neither can credibly promise "zero accounts, zero telemetry, zero network calls from the app, ever." DockTerm can.

3. **Ship the Diff-to-Commit demo GIF before writing a single line of app code.** Design the intended UX in Figma, record a prototype walkthrough, and post it as a "Show HN: I'm building this, want it?" before coding starts. This validates demand with near-zero investment.

4. **Cut the Skills/commands panel from V1.** It adds UI complexity without being part of the viral demo moment. V1.1.

5. **Defer multi-session / worktree management.** Warp already owns this space. Let Warp be the multi-session tool. Let DockTerm be the single-session focus tool.

6. **Verify checkpoint data access early.** Before V1 commitment, read `~/.claude/` to confirm checkpoint state is accessible, stable, and documented. If not, fall back to the "compare vs saved commit hash" approach described in the product spec, which achieves the same user outcome via clean git primitives rather than Claude's internal session state.

7. **Prioritize Windows 11 from day one.** The dev machine is Windows 11. node-pty + xterm.js on Windows has historically had rough edges (conpty, path quoting, ANSI rendering). Write platform integration tests for Windows before macOS, since Windows is harder. macOS will work more easily once Windows is solid.

---

## Rejected Ideas

| Idea | Reason Rejected |
|---|---|
| Build on top of VS Code (as an extension) | Loses the "no VS Code" value proposition; competes directly with Anthropic's first-party extension |
| Use a web browser as the "app" (Electron-less) | node-pty requires native process spawning; xterm.js works better with Electron's Node integration; packaging complexity without real benefit |
| Add an AI chat panel to DockTerm | Violates the "no AI API calls" rule; creates confusion about DockTerm's role vs. Claude Code's role; users would expect feature parity with Claude that we cannot deliver |
| Build a plugin/extension system in V1 | Anti-bloat rule #3; adds enormous surface area; every plugin breaks on Electron upgrades |
| Monaco with full IDE features enabled | Anti-bloat rule #2; the moment IntelliSense appears, users expect it everywhere and file bugs when it doesn't work |
| Electron alternative (Tauri) | Tauri's WebView2 on Windows has known xterm.js rendering issues; Electron is better supported for terminal apps specifically; revisit for V2 if bundle size becomes a complaint |
| Built-in PR creation UI | Too many Git hosting providers (GitHub, GitLab, Gitea, Bitbucket, Azure DevOps) with different APIs; scope nightmare in V1 |
| Claude Code session auto-detection | Tempting, but brittle — relies on process inspection, PID tracking, and shell integration that varies by OS and shell. In V1, the user opens DockTerm and types `claude` themselves. Explicit is better than magic. |

---

## V1 Recommendations

### Must-Ship Feature List (ranked by criticality)

1. Real terminal (xterm.js + node-pty, Windows + macOS, your existing shell)
2. File tree with changed-file highlighting (watch filesystem for changes while `claude` runs)
3. Monaco diff panel (read-only diff of any file in the tree; spot edits allowed but no LSP)
4. Git panel: current branch, staged/unstaged status, stage-all, commit (with message input), push
5. Command palette (Ctrl/Cmd+K) with keyboard-first navigation
6. Settings: theme (dark/light), panel layout persistence, shell executable path
7. Project info panel: displays CLAUDE.md if present, current branch, last commit message

### V1.1 Features (next release after initial launch)

- Bottom mini-terminal (second xterm.js instance, collapsible)
- MCP servers panel (read from `~/.claude/settings.json`, show status, allow enable/disable/restart)
- Checkpoint visualizer (timeline of Claude session states → link to diff panel)
- Skills/commands panel (browse installed Claude Code skills and slash commands)

### Technical Risks to Validate Before Writing App Code

1. **node-pty on Windows 11 with modern PowerShell:** Test conpty compatibility with the user's shell (PowerShell 7, cmd, bash via WSL). Confirm xterm.js renders color output from `claude` correctly — Claude Code's output is ANSI-heavy.
2. **Checkpoint data format:** Determine if `~/.claude/` session files are human-readable and stable enough to parse. If not, design the "checkpoint" feature as a git-diff-based comparison instead.
3. **Monaco bundle size in Electron:** Monaco is large (~10MB). Confirm acceptable load time on first open. Consider lazy-loading the Monaco panel only when a diff is first requested.
4. **File watcher performance:** On a large repo (10k+ files), `chokidar` or `fs.watch` can be expensive. Use gitignore-aware watching from day one; never watch `node_modules`.

### Monetization (Future Only — Nothing in V1)

DockTerm is MIT-licensed, free, and has no commercial model in V1. Future paths, to be evaluated after meaningful adoption:
- **DockTerm Pro:** Optional cloud backup of workspace layouts and settings across machines. One-time purchase, $15–25. Not a subscription. Does not change the local-first guarantee — it's an additive sync layer.
- **Team edition:** Multi-developer layout templates and shared CLAUDE.md management. For studios using Claude Code at scale.
- **No freemium model.** V1 must be 100% free and fully functional. Paywalling features in a tool that competes with free Warp and Anthropic's own free-tier desktop app is instant death.

---

*All citations retrieved 2026-06-11. Web sources should be re-verified before any pitch or press materials.*

**Sources consulted:**
- [Claude Code Desktop Redesign — Anthropic](https://claude.com/blog/claude-code-desktop-redesign)
- [Claude Code VS Code extension docs](https://code.claude.com/docs/en/vs-code)
- [Warp Claude Code integration](https://www.warp.dev/agents/claude-code)
- [Warp goes open source — FOSS Force](https://fossforce.com/2026/05/after-years-of-teasing-warp-finally-goes-open-source/)
- [Warp Code: prompt to production](https://www.warp.dev/blog/introducing-warp-code-prompt-to-prod)
- [Warp pricing](https://www.warp.dev/pricing)
- [Best Claude Code GUI tools 2026 — Nimbalyst](https://nimbalyst.com/blog/best-claude-code-gui-tools-2026/)
- [Claude Code checkpoints — Hacker News](https://news.ycombinator.com/item?id=45050090)
- [Code Review for Claude Code — Hacker News](https://news.ycombinator.com/item?id=47313787)
- [Terminal agents replacing VS Code — XDA Developers](https://www.xda-developers.com/vs-code-terminal-agents-editor-workflow/)
- [Context switching pain — MindStudio](https://www.mindstudio.ai/blog/claude-desktop-app-vs-terminal-agentic-work)
- [Claude Code checkpointing docs](https://code.claude.com/docs/en/checkpointing)
- [Claude Code branch-switching pain — DEV Community](https://dev.to/davidcreador/i-was-losing-my-mind-switching-branches-with-claude-code-so-i-built-this-5e5f)
- [VentureBeat on Claude Code desktop app redesign](https://venturebeat.com/orchestration/we-tested-anthropics-redesigned-claude-code-desktop-app-and-routines-heres-what-enterprises-should-know/)
- [Claude Code Reddit workflows — AI Tool Discovery](https://www.aitooldiscovery.com/guides/claude-code-reddit)
- [Claude Code enabling autonomous work — Anthropic](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
