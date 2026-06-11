# DockTerm Competitor Research
**Date:** 2026-06-11  
**Researcher:** Competitor Research Agent  
**Scope:** Terminal emulators, editors/IDEs, Git UX tools, Claude Code ecosystem tools  

---

## Findings

### 1. Terminal Emulators

#### iTerm2 (macOS only)
Currently at v3.6.10 (April 2026). Mature, deeply trusted by macOS power users with split panes, profiles, shell integration, Bitwarden/Keeper password manager support, an AI Chat panel that can annotate command output, and an optional web-browser profile mode. Overlap: it is the gold standard "terminal-first" tool on Mac with panels. What DockTerm must NOT copy: iTerm2's settings surface has become enormously complex (hundreds of profile options, triggers, smart selection rules, coprocess scripting). It's also macOS-only with no Windows story.  
Sources: [iTerm2 Downloads](https://iterm2.com/downloads.html) | [iTerm2 Review 2026](https://dockshare.io/apps/iterm2)

#### Warp
Currently the most aggressive terminal innovator. Warp is now the "Agentic Development Environment" — Rust-based, GPU-accelerated, with AI Agent Mode (multi-step plan-and-execute), Active AI (contextual suggestions, next-command recommendations, auto-fix diffs), MCP server support so the local agent talks to Linear/Sentry/Postgres, and Oz, a cloud orchestrator for up to 40 concurrent background agents dispatched by Slack/GitHub/cron. Login requirement was lifted November 2024, but the best experience (and meaningful agentic work) requires the $18/mo Build plan (1,500 AI credits, 20 concurrent cloud agents). Free tier gives 75 monthly credits after two months.  
**Overlap:** Warp is converging hard on "terminal + agentic orchestration" — the closest conceptual competitor to DockTerm's ambient Claude Code experience. **What DockTerm must NOT copy:** Warp's cloud agent orchestration (Oz), its AI credit monetization model, and its "we ARE the AI" identity. DockTerm's hero is the user running `claude` manually; it must stay zero-cloud, zero-telemetry, zero-subscription.  
Sources: [Warp Guide 2026](https://www.deployhq.com/guides/warp) | [Warp Agent Mode](https://www.warp.dev/ai) | [Lifting login requirement](https://www.warp.dev/blog/lifting-login-requirement)

#### Wave Terminal
An open-source, AI-integrated, cross-platform terminal (Go/Electron hybrid). The key architectural idea is that everything is a widget: terminal blocks, file previews, web views, AI chat panels, and a Process Viewer can all be added, removed, moved, and resized in a flexible grid. Recent additions include tab/block badges, a slide-out AI chat panel with multimodal input, and custom widgets via `widgets.json`. Fully cross-platform including Windows.  
**Overlap:** Wave's panel/widget model is the closest architectural precedent for DockTerm's dock panels concept. **What DockTerm must NOT copy:** Wave embeds AI chat as a first-class widget (calling out to cloud LLMs); DockTerm has no AI API calls. Also avoid copying Wave's extremely open-ended widget customization system in V1 — it adds complexity DockTerm doesn't need yet.  
Sources: [Wave Terminal Docs](https://docs.waveterm.dev/) | [Wave Widgets](https://docs.waveterm.dev/widgets) | [Wave GitHub](https://github.com/wavetermdev/waveterm)

#### Ghostty
Fast-growing GPU-accelerated terminal (Zig, platform-native UI). Released 1.3.0 in March 2026, adding scrollback search, native scrollbars, click-to-move-cursor, command palette, modal keybindings, and background images. Moved under Hack Club's 501(c)(3) in December 2025 — no VC money, no telemetry, no accounts. 45,000+ GitHub stars in under 15 months (Dec 2024 launch). macOS + Linux; Windows is listed as a non-goal.  
**Overlap:** DockTerm's "no telemetry, no accounts" ethos mirrors Ghostty's. **What DockTerm must NOT copy:** Ghostty's approach of being a pure terminal emulator with no panel/dock system. DockTerm's value is the dock layer on top of a real terminal, not the terminal rendering itself.  
Sources: [Ghostty 1.3.0](https://ghostty.org/docs/install/release-notes/1-3-0) | [Ghostty Review 2026](https://dockshare.io/apps/ghostty)

#### Tabby
Cross-platform (Windows, macOS, Linux), Electron-based. Actively maintained — v1.0.234 released May 2026. Strong SSH/SFTP/serial story, plugin/theme system installable from Settings, tab memory between sessions, and MCP server integration for connecting AI assistants via Cursor/Windsurf. Good Windows support.  
**Overlap:** Tabby's MCP integration and Windows support are relevant. **What DockTerm must NOT copy:** Tabby's SSH client, serial connection support, and ZMODEM file transfer — these are scope creep for DockTerm. Also avoid Tabby's theme gallery (V1 anti-goal).  
Sources: [Tabby GitHub](https://github.com/eugeny/tabby) | [Tabby Features](https://tabby.sh/about/features)

#### Hyper
Effectively abandoned. Last release: v3.4.1, January 8, 2023 — over three years ago. 946 open issues, 97 pending PRs. Users have filed GitHub issues asking if it's dead (including one specifically about macOS 26 compatibility). Maintainer noted personal issues in January 2024 but no substantial updates followed. Still has 44,600 stars but no active development.  
**Conclusion for DockTerm:** Hyper's Electron-on-web-tech architecture was the right instinct, but its abandonment is a cautionary tale. DockTerm must commit to a maintenance cadence and clear versioning policy from day one.  
Sources: [Hyper GitHub](https://github.com/vercel/hyper) | ["Is this project abandoned?" issue](https://github.com/vercel/hyper/issues/7923)

#### Windows Terminal
Microsoft's own, v1.25 released March 2026. Features: command palette with multilingual keyword support, Extensions settings page, Synchronized Output (anti-flicker), Kitty keyboard protocol support, settings search, and a planned UI redesign (modular settings window). Ships in-box with Windows 11. No AI integration, no panels/dock.  
**For DockTerm:** Windows Terminal proves Windows users accept and expect good terminal UX. DockTerm should treat it as the baseline and target compatibility — users who run `claude` in WT will find DockTerm familiar.  
Sources: [Windows Terminal 1.25](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-25-release/)

#### WezTerm, kitty, Alacritty (brief)
- **WezTerm:** Last stable release February 2024; maintainer calls it a "spare time project." Nightly builds continue. Best-in-class multiplexer and image protocol support, but hard to recommend for new projects given uncertainty. macOS/Linux/Windows.
- **kitty:** v0.46.2, March 2026. Actively maintained by Kovid Goyal. Originated the Kitty graphics protocol. 30% developer preference among power users. macOS/Linux only.
- **Alacritty:** Actively maintained, ~30 MB RAM, deliberately minimal (no tabs, no splits, no images). Cross-platform. Philosophy: render text fast, nothing else.  
Sources: [Best Terminal 2026](https://vibehackers.io/blog/best-terminal-for-mac) | [Terminal Emulators 2026](https://dasroot.net/posts/2026/03/linux-terminal-emulators-alacritty-kitty-wezterm/)

---

### 2. Editors / IDEs

#### VS Code
The dominant incumbent. In 2025-2026, GitHub Copilot Agent Mode became generally available across VS Code and JetBrains (March 2026), turning VS Code into a full agentic environment. Copilot now assigns GitHub Issues autonomously, opens PRs, runs tests, streams terminal output inline in Chat, and includes an official Claude Code extension (sidebar, inline diffs, checkpoints, plan review, file @-mentions, plugin management). The Source Control panel, built-in terminal, live diff viewer, and agentic code review (March 2026) make VS Code the primary Claude Code host for most users today.  
**Overlap:** The official `anthropic.claude-code` VS Code extension already does: sidebar conversation, inline diffs, checkpoints with rewind, plan review, and file tree context. This is the strongest direct competitor. **What DockTerm must NOT copy:** VS Code's extension marketplace, language server protocol, full debugger, Copilot's deep IDE integration, or any feature that makes DockTerm look like "VS Code lite."  
Sources: [Claude Code in VS Code](https://code.claude.com/docs/en/vs-code) | [VS Code Copilot Harness](https://code.visualstudio.com/blogs/2026/05/15/agent-harnesses-github-copilot-vscode) | [VS Code adapts to Claude Code](https://visualstudiomagazine.com/articles/2026/05/04/special-embrace-vs-code-adapts-to-claude-codes-ecosystem.aspx)

#### Cursor
A VS Code fork whose identity is the AI coding agent, not the editor. Cursor 2.6 introduced always-on "Automations" — event-driven agents that run even when you're away. AI commit messages, Cursor Blame (tracks AI-generated lines), @Git context in chat, agent mode with terminal execution and test runs. Git integration is tight but entirely IDE-scoped; there's no standalone terminal first-class experience. Cursor Backgrounds requires a subscription.  
**For DockTerm:** Cursor users who want to run `claude` from a terminal (not inside Cursor's agent mode) are a target audience — they want DockTerm's neutral, terminal-first environment.  
Sources: [Cursor Docs](https://docs.cursor.com/context/@-symbols/@-git) | [Cursor Git](https://cursor.com/help/integrations/git)

#### Zed
GPU-accelerated, built in Rust, not Electron. The 2026 headline feature is Terminal Threads (May 2026): Claude Code, Amp, or any CLI agent runs as a persistent sidebar thread inside Zed, same UI as native agent threads, with full context display and notification support. ACP (Agent Client Protocol) lets external CLI agents integrate into Zed's UI. Multiple parallel agent threads supported. Edit Prediction via Zeta2 (open-weight). Multi-provider: Claude Opus/Sonnet, GPT-5.4, local via Ollama.  
**Overlap:** Zed's Terminal Threads is the closest existing product to what DockTerm wants to be — a native UI layer wrapping a terminal-running agent. **What DockTerm must NOT copy:** Zed's full code editor, its language-server-backed intelligence, its multi-provider AI backend, and its macOS/Linux-first nature (Zed has limited Windows support). DockTerm is terminal-first, editor-optional; Zed is editor-first, terminal-as-sidebar.  
Sources: [Zed AI 2026](https://www.builder.io/blog/zed-ai-2026) | [Zed Editor Review](https://aicoderscope.com/blog/zed-editor-ai-review-2026/)

---

### 3. Git UX Tools

#### lazygit
Go-based TUI git client. v0.59.0, February 2026 — actively maintained. Six-panel layout (status, files, branches, commits, stash, diff). Line-level and hunk-level staging with visual feedback. Interactive rebase with drag-and-drop. Most beginner-friendly TUI option: clear panel focus indicators, space-to-stage intuition, extensive keybinding help overlays. Cross-platform including Windows.  
**What DockTerm should take from lazygit:** The three-pane staged/unstaged/diff layout is the right mental model for a beginner-safe git panel. lazygit makes destructive ops (force push, rebase) visible with warnings.  
Sources: [lazygit](https://lazygit.dev/) | [lazygit Guide 2026](https://www.heyuan110.com/posts/ai/2026-04-10-lazygit-guide/)

#### gitui
Rust-based TUI git client. Faster than lazygit on large repos. Steeper learning curve, fewer hand-holding features. Targets power users who know git. Less beginner-friendly: no rebase-by-drag, more keyboard-only flows.  
**For DockTerm:** gitui's Rust performance is admirable but its UX philosophy is wrong for DockTerm's "beginner-safe" git goal. DockTerm's git panel should draw from lazygit, not gitui.  
Sources: [gitui GitHub](https://github.com/gitui-org/gitui)

#### GitHub Desktop
Free, GitHub-only, no paid tiers. Extremely simplified: no terminal, no rebase, no cherry-pick, no SSH key management. Recommended for beginners and small GitHub-only teams. Its UX strength is the commit message + staged/unstaged split: clean, visual, one action at a time. Works on Windows and macOS.  
**What DockTerm should take:** GitHub Desktop's staged/unstaged file list with per-file diff preview is the visual pattern DockTerm's git panel should emulate — simple enough that a beginner won't accidentally force-push.  
Sources: [GitHub Desktop vs GitKraken](https://www.gitkraken.com/compare/gitkraken-vs-github-desktop)

#### GitKraken Desktop
Full-featured GUI with a signature commit graph (color-coded branching tree), built-in merge conflict editor, JIRA/GitHub/GitLab integrations, and team collaboration. Free tier for basic ops; paid for advanced integrations and team features. Beginner-accessible but its power features (interactive rebase, submodules, deep GitHub integration) create visual complexity.  
**What DockTerm must NOT copy:** GitKraken's commit graph visualization (scope creep), its paid-tier team features, and its plugin ecosystem. DockTerm's git panel is beginner-safe staging + commit — not a full git GUI.  
Sources: [GitKraken Guide](https://help.gitkraken.com/gitkraken-desktop/guide/) | [Best Git Clients 2026](https://lithiumgit.com/most-popular-git-gui-clients)

---

### 4. Claude Code Ecosystem Tools (CRITICAL)

#### Nimbalyst (formerly Crystal)
Crystal (by Stravu) was the first multi-session Claude Code GUI. It was deprecated in February 2026 and replaced by Nimbalyst — same team, same idea, more tools. Nimbalyst is now the most feature-complete open-source Claude Code visual workspace: kanban session board (every session is a card through backlog → planning → implementing → validating → complete), one-click git worktree isolation per session, inline red/green diff review for every file type, 7+ visual editors (markdown WYSIWYG, mockups, diagrams, code), task tracker, iOS companion app. Supports Claude Code and Codex. Free for individuals, MIT-licensed. Cross-platform including Windows.  
**Overlap:** Nimbalyst is the strongest direct competitor to DockTerm in the Claude Code GUI space. It does kanban, worktrees, diff review, and multi-session management. **Weakness:** Nimbalyst is a visual workspace overlay — it does NOT include a real embedded terminal where you run `claude` manually. It manages sessions via its own launcher, not a terminal-first workflow. No MCP visibility panel, no skills/commands browser, no Git safety UI for beginners unfamiliar with worktrees. DockTerm's terminal-first, single-session-with-dock approach is architecturally different.  
Sources: [Nimbalyst](https://nimbalyst.com/) | [Crystal successor post](https://nimbalyst.com/crystal/) | [Best Claude Code GUI 2026](https://nimbalyst.com/blog/best-claude-code-gui-tools-2026/)

#### opcode (formerly Claudia)
Started as Claudia, renamed opcode mid-2025. Built with Tauri 2. ~21,000 GitHub stars — most popular open-source Claude Code GUI by community size. Features: session management, custom AI agent builder (JSON-configured system prompts, model selection, tool permissions), CLAUDE.md editor with live preview and project-wide scanner, MCP server management, usage analytics dashboard.  
**Critical weakness:** Last release August 31, 2025 — no updates in ~10 months as of June 2026. Effectively stalled. No Windows support. No embedded terminal (it's a session launcher, not a terminal). No diff/review workflow, no git UI.  
Sources: [opcode](https://opcode.sh/) | [opcode GitHub](https://github.com/winfunc/opcode) | [Claudia → opcode](https://claudiacode.com/)

#### Conductor (by Melty Labs)
Mac-only desktop app (raised $22M Series A) for running multiple Claude Code/Codex agents in parallel, each in an isolated git worktree. Dashboard shows what each agent is working on. Diff-first review interface for examining, approving, and merging agent-generated code. Free (you bring your own Claude/Codex subscription).  
**Weakness:** Mac-only — no Linux, no Windows, no web. The GitHub permissions controversy (July 2025) created trust concerns. Focused entirely on multi-agent parallelism; no terminal-first single-session flow, no dock panels, no MCP visibility, no skills browser.  
Sources: [Conductor](https://www.conductor.build/) | [Conductor Melty Labs](https://madewithlove.com/blog/conductor-running-multiple-ai-coding-agents-in-parallel/) | [GitHub Permissions Controversy](https://biggo.com/news/202507210115_Conductor_App_GitHub_Permissions_Controversy)

#### Claude Code Desktop (Official Anthropic)
Anthropic rebuilt the Claude Code Desktop app in April 2026. Key features: sidebar listing all active/recent sessions (filterable by status/project/environment), drag-and-drop workspace layout, side chat shortcut (Cmd+;) for branching questions off a running task, integrated terminal for tests/builds, in-app file editor for spot edits, rebuilt diff viewer for large changesets, expanded preview pane for HTML/PDFs/local servers. Requires Claude subscription (Max, Pro, Team, or Enterprise).  
**Weakness:** Subscription-required (Claude account mandatory). Closed-source, cloud-tied. No beginner git safety UI, no MCP panel visibility, no Claude skills/commands browser. The integrated terminal is secondary to the session manager, not primary.  
Sources: [Claude Code Desktop Docs](https://code.claude.com/docs/en/desktop) | [Anthropic Rebuilds Desktop App](https://www.macrumors.com/2026/04/15/anthropic-rebuilds-claude-code-desktop-app/) | [VentureBeat Hands-On](https://venturebeat.com/orchestration/we-tested-anthropics-redesigned-claude-code-desktop-app-and-routines-heres-what-enterprises-should-know)

#### VS Code Claude Code Extension (Official, `anthropic.claude-code`)
The official Anthropic VS Code extension provides: dedicated sidebar with conversation history, inline diffs, checkpoints with three-way rewind (fork conversation, rewind code, or both), plan review before accepting changes, @-file mentions with line ranges, plugin management via `/plugins`, extended thinking visibility, and May 2026 "special embrace" from VS Code itself with tighter ecosystem hooks.  
**Weakness:** Requires VS Code — not usable outside the IDE. Not terminal-first. Users who prefer a bare terminal + minimal companion are underserved.  
Sources: [Claude Code in VS Code](https://code.claude.com/docs/en/vs-code) | [VS Code Extension Guide 2026](https://www.eesel.ai/blog/claude-code-vs-code-extension)

#### Vibe Kanban
Open-source (BloopAI), web-based. Plan with kanban issues, run agents in isolated workspaces (each agent gets a branch + terminal + dev server), review diffs with inline comments, supports 10+ coding agents including Claude Code. Free.  
**Weakness:** Web UI, not native desktop. Team/project-management focus; no terminal-first single-user workflow. No MCP or skills panel visibility.  
Sources: [Vibe Kanban GitHub](https://github.com/BloopAI/vibe-kanban) | [vibekanban.com](https://vibekanban.com/)

#### Happy Coder
Mobile (iOS + Android) companion for Claude Code/Codex. Signal-level encryption (TweetNaCl), push notifications for permission requests and task completion, session continuation between desktop and mobile. Open-source.  
**Weakness:** Mobile-only; not a desktop companion. Designed for monitoring running sessions remotely, not for UI around the terminal experience.  
Sources: [Happy on App Store](https://apps.apple.com/us/app/happy-codex-claude-code-app/id6748571505) | [Happy GitHub](https://github.com/slopus/happy)

#### CC Usage Dashboards
Multiple tools: **ccusage** (CLI, tracks tokens/costs across Claude Code and 15+ other CLI agents, open-source), **claude-usage** (local dashboard + VS Code sidebar extension), **Claude Code Usage Monitor** (real-time terminal dashboard with ML burn-rate predictions). Anthropic ships `/usage` natively in Claude Code. Team/Enterprise users get `claude.ai/analytics`.  
**For DockTerm:** A lightweight session cost display in the project info panel is sufficient; no need to build a full analytics dashboard.  
Sources: [ccusage](https://ccusage.com/) | [Claude Code Usage Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)

#### Diffity + Plannotator
Emerging niche tools: **Diffity** is a GitHub-style diff viewer for reviewing Claude Code/Cursor/Codex agent changes (open-source, agent-agnostic). **Plannotator** is a browser-native plan annotation + code-diff review layer that feeds feedback back into the agent loop.  
**For DockTerm:** These validate that "reviewing agent-generated diffs" is an unsolved problem many developers feel. DockTerm's diff/review dock panel with checkpoints addresses this gap.  
Sources: [Diffity GitHub](https://github.com/kamranahmedse/diffity)

---

### 5. Gap Map

| Capability | Warp | Wave | Nimbalyst | opcode | Conductor | Claude Code Desktop | VS Code Extension | Zed Terminal Threads | DockTerm |
|---|---|---|---|---|---|---|---|---|---|
| **Real embedded terminal (user runs `claude` manually)** | YES | YES | NO | NO | NO | Partial | NO | Partial | **YES** |
| **Terminal-first, not IDE/GUI-first** | YES | YES | NO | NO | NO | NO | NO | NO | **YES** |
| **File tree panel** | NO | Partial | NO | NO | NO | NO | YES (VS Code) | YES | **YES** |
| **Inline Monaco editor panel** | NO | NO | NO | NO | NO | Partial | YES (VS Code) | YES | **YES** |
| **Git safety UI (beginner-safe stage/commit)** | NO | NO | NO | NO | NO | NO | Partial | NO | **YES** |
| **Diff/review of agent changes w/ checkpoints** | NO | NO | YES | NO | YES | Partial | YES | NO | **YES** |
| **MCP servers visibility panel** | NO | NO | NO | YES (opcode) | NO | NO | NO | NO | **YES** |
| **Claude skills/commands browser panel** | NO | NO | NO | NO | NO | NO | NO | NO | **YES** |
| **No account / no cloud required** | Partial* | YES | YES | YES | YES | NO | YES | YES | **YES** |
| **Windows support** | YES | YES | YES | NO | NO | YES | YES | NO | **YES** |
| **Open-source / no telemetry** | NO | YES | YES | YES | NO | NO | NO | YES | **YES** |

*Warp: login no longer required to launch, but cloud AI credits gate meaningful use.

**DockTerm's wedge:** DockTerm is the only terminal-first, no-account, no-cloud, cross-platform (Windows + macOS) workspace that wraps a real embedded terminal — where users run `claude` manually — with on-demand dock panels for file browsing, lightweight editing, beginner-safe git, agent diff review with checkpoints, MCP visibility, and Claude skills browsing, without requiring an IDE, a subscription, or any AI API calls of its own.

---

### 6. Five Features Competitors Have That DockTerm Must NOT Build in V1

1. **Multiple terminal tabs/splits/panes** (Warp, iTerm2, Tabby, Wave): Every terminal app has this, and users have muscle memory for their preferred multiplexer (tmux, zellij, Windows Terminal). Adding a tab system in V1 delays shipping the unique dock panels and creates an expectation DockTerm can't beat. Let the user's existing terminal habits handle multiplexing; DockTerm's value is the dock, not the terminal chrome.

2. **SSH client / remote connection manager** (Tabby, WezTerm, iTerm2): SSH support immediately inflates scope — key management, port forwarding, SFTP, session reconnection, security review, remote filesystem browsing. None of Claude Code's core workflow requires this in V1. It would double the maintenance burden.

3. **AI command suggestions / inline AI assistance** (Warp Active AI, iTerm2 AI Chat, Zed Edit Prediction): DockTerm's non-goal is zero AI API calls. Adding "suggest what to type" or "explain this error" turns DockTerm into a Warp competitor with worse models and a telemetry problem. The terminal panel must be a dumb PTY.

4. **Plugin / extension marketplace** (Tabby, VS Code, Hyper): A plugin system requires an API contract, documentation, a registry, security review of community code, and version compatibility work. This is how Hyper died (ecosystem fragmentation, Electron API churn, no active curation). V1 must be a closed set of first-party panels refined to excellence.

5. **Theme gallery / advanced visual customization** (Tabby, Warp, Hyper, iTerm2): Theme stores attract design-focused contributors but distract from core workflow UX. DockTerm should ship one well-designed dark theme and one light theme, expose OS-level dark/light mode toggling, and defer a theme system until V2 at the earliest. Visual polish effort should go into the dock interaction model, not color palettes.

---

## Risks

1. **Anthropic's own desktop app is accelerating.** The April 2026 redesign added a sidebar, diff viewer, integrated terminal, and session management. If Anthropic ships a "beginner-safe git panel" or "MCP visibility panel" in their official app (which ships with every Claude subscription), DockTerm's wedge narrows significantly. Monitor Anthropic's changelog weekly.

2. **Nimbalyst is the most direct open-source threat.** It is free, MIT-licensed, actively maintained, cross-platform, and covers diff review + worktrees well. If Nimbalyst adds a real embedded terminal and a git safety panel, DockTerm's differentiation collapses. DockTerm must ship before Nimbalyst closes the terminal-first gap.

3. **Warp's "no login" move reduced its main friction point.** Warp now reaches users who previously refused it on principle. Its AI features are heavily funded ($70M+ raised) and improving fast. DockTerm cannot compete on AI features — it must be anti-Warp: silent, local, zero-cloud, zero-credits.

4. **Zed Terminal Threads (May 2026) proves the concept works** but targets Zed users, not terminal-native users. Zed has limited Windows support, which leaves the Windows Claude Code audience for DockTerm.

5. **opcode's stall (no release since Aug 2025)** is an opportunity: its ~21,000 GitHub fans want something. DockTerm can win that audience by launching with the features opcode never completed (embedded terminal, git panel, Windows support).

6. **Electron weight is a reputational risk.** Hyper proved that Electron terminals can be abandoned, and Warp/Ghostty/Alacritty/kitty/WezTerm all market native-tier performance as a virtue. DockTerm should minimize Electron's footprint: use a native terminal renderer (node-pty + xterm.js or similar), keep the dock panels lightweight, and publish startup time benchmarks.

---

## Decisions (Recommended)

1. **Build DockTerm as an Electron app wrapping xterm.js (node-pty) for the terminal pane** — this matches Wave Terminal's proven cross-platform architecture and is buildable by a small team without native Rust/Zig/Swift expertise.

2. **Launch with exactly these dock panels in V1:** File tree, Monaco editor (read/edit only, no LSP), Git panel (lazygit-inspired: staged/unstaged list + diff preview + commit message box, no rebase), Diff/Review panel (checkpoint-based, per-turn diffs of what Claude wrote), MCP servers panel (list active servers, show tool names, no configuration UI in V1), Skills/Commands panel (list available skills and slash commands), Command palette, Project info (CLAUDE.md viewer + session cost estimate), Settings, Mini-terminal (bottom).

3. **Prioritize Windows parity from day one.** No competitor does terminal-first + Windows + no-account + full dock well. This is the clearest uncontested position.

4. **Make "no account, no cloud, no telemetry" a design constraint enforced in code**, not a promise. No analytics SDK, no update-check ping, no crash reporter. Communicate this explicitly in README and first-launch screen — it is a trust differentiator vs. Warp and the official Claude Code Desktop.

5. **Position the Git panel explicitly as "safe for Claude Code users who aren't git experts."** Stage by file (not by hunk in V1), confirm before push, block force-push to main by default, show branch name prominently. This is the gap every competitor ignores.

---

## Rejected Ideas

- **Building a terminal emulator from scratch** (native GPU renderer, full VT parsing): Out of scope. Use xterm.js. The value is the dock system, not the terminal renderer.
- **SSH client and remote machine support**: Scope creep. Non-goal for V1.
- **Multi-agent session orchestration / kanban board**: Nimbalyst and Conductor own this space. DockTerm is single-session-focused; multi-agent orchestration is a V3 topic at earliest.
- **AI API calls / model integration**: Hard non-goal. DockTerm must never call an LLM directly.
- **Plugin / extension marketplace**: Kills maintainability. Rejected for V1 and V2.
- **Mobile companion app**: Happy Coder already exists and does this well. Not a DockTerm concern.
- **Usage analytics dashboard**: ccusage and the official `/usage` command cover this. The project info panel can show the current session's cost estimate; that's sufficient.
- **Theme gallery**: One dark, one light, OS sync. Ship it and move on.
- **Commit graph visualization**: GitKraken owns this. DockTerm's git panel is commit-and-stage, not history exploration.

---

## V1 Recommendations

1. **Terminal pane is the hero; everything else is a panel.** The default layout should be: terminal fills 70% of the window, dock is a collapsible right sidebar. Every panel is opt-in, toggleable, and remembers its state per project.

2. **The Diff/Review panel is the unique V1 killer feature.** No Claude Code tool does "checkpoint-based, per-turn diff review of what the agent wrote" in a terminal-first, no-cloud package. Build this well before launch. Integrate with Claude Code's native `/diff` output and `.claude/` checkpoint files.

3. **Beginner-safe git panel must be visually obvious.** Show current branch in the panel header. List staged vs. unstaged files with checkboxes. Show per-file diff inline. Commit message box with character count. Push button that warns if the branch is main/master. Block operations (force-push, hard reset) behind a confirmation modal with plain-English explanation of consequences.

4. **MCP and Skills panels are differentiators for the Claude Code power-user audience.** No other tool surfaces "what MCP servers are running" and "what skills/commands are available" in a dedicated panel. This makes DockTerm feel purpose-built for Claude Code, not a generic terminal wrapper.

5. **Ship on Windows first** or simultaneously with macOS. The entire Claude Code GUI ecosystem deprioritizes Windows (opcode: Mac/Linux only; Conductor: Mac only; Zed: Mac/Linux primary). Windows Claude Code users are an underserved market with no terminal-first companion app.

6. **Keep the binary under 100 MB and cold-start under 3 seconds on a mid-range machine.** Publish benchmarks. This counters the Electron reputation risk.

7. **Adopt a visible release cadence from day one**: weekly patch releases, monthly minor releases. Hyper's lesson: the appearance of abandonment kills an Electron terminal faster than any bug.

---

*All facts verified via web search on 2026-06-11. Key sources:*
- [Warp Guide 2026](https://www.deployhq.com/guides/warp)
- [Wave Terminal Docs](https://docs.waveterm.dev/)
- [Ghostty 1.3.0 Release Notes](https://ghostty.org/docs/install/release-notes/1-3-0)
- [Hyper GitHub (abandoned)](https://github.com/vercel/hyper)
- [Windows Terminal 1.25](https://devblogs.microsoft.com/commandline/windows-terminal-preview-1-25-release/)
- [Tabby GitHub](https://github.com/eugeny/tabby)
- [Nimbalyst](https://nimbalyst.com/)
- [opcode](https://opcode.sh/)
- [Conductor](https://www.conductor.build/)
- [Claude Code Desktop Docs](https://code.claude.com/docs/en/desktop)
- [Claude Code VS Code Extension](https://code.claude.com/docs/en/vs-code)
- [Vibe Kanban](https://github.com/BloopAI/vibe-kanban)
- [ccusage](https://ccusage.com/)
- [lazygit](https://lazygit.dev/)
- [Zed AI 2026](https://www.builder.io/blog/zed-ai-2026)
- [VS Code Copilot Agent Mode](https://code.visualstudio.com/blogs/2025/02/24/introducing-copilot-agent-mode)
- [Best Claude Code GUI 2026](https://nimbalyst.com/blog/best-claude-code-gui-tools-2026/)
