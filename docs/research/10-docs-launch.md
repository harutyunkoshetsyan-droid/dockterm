# DockTerm: Documentation & Launch Research Report
**Research Date:** 2026-06-11
**Agent:** Documentation/Launch Agent
**Scope:** README blueprint, tagline, GitHub metadata, visual assets plan, community files, docs/ plan, launch plan

---

## Findings

### What Makes Dev-Tool Repos Trend in 2025–2026

Research across successful launches (Ghostty, Superset, OpenCode, AnythingLLM) and GitHub README guides reveals consistent patterns:

**Structural patterns that drive stars:**
- Title + one-liner pitch must answer: *what it is, why it's different, who it's for* — all within the first 50 words
- Screenshot or GIF in the first screen (above the fold) is non-negotiable for conversion; tools with animated GIFs receive measurably higher engagement than text-only alternatives
- Star history charts increase conversion by ~15% according to GitHub growth research ([Source](https://dev.to/iris1031/github-readme-template-the-complete-2026-guide-to-get-more-stars-3ck2))
- Quick-start must be under 3 steps, copy-paste only; failure to reach this bar kills traction
- Feature tables outperform bullet-point paragraphs in scannability

**Privacy as a genuine differentiator (2025–2026):**
Ghostty's zero-telemetry stance — explicitly stated as "No analytics, no crash reporting, no update pings. Ghostty respects your privacy by default" — became a primary positioning message cited across every review and comparison article. This stance, combined with MIT license, made it the default terminal recommendation in macOS dev guides within 12 months. Notably, GitHub CLI *added* telemetry by default in April 2026, creating a backlash and making opt-out tools more attractive. AnythingLLM's tagline "Stop renting your intelligence. Own it" shows the same local-first positioning resonating in AI tooling. ([Ghostty launch](https://mitchellh.com/writing/ghostty-is-coming)) ([GitHub CLI telemetry backlash](https://www.techzine.eu/news/devops/140736/github-cli-now-collects-usage-data-by-default/))

**Comparable tools in the space:**
- **Superset** (Claude Code + parallel agents, Electron + Tauri, ELv2 license): tagline "The Code Editor for AI Agents." Positioned on orchestration and parallel worktrees. Source-available, not MIT. No "why not X" framing; differentiates through feature breadth. ([GitHub](https://github.com/superset-sh/superset))
- **OpenCode** (terminal TUI, multi-LLM, Go, MIT): Led with technical depth over onboarding friendliness. Archived the original repo; lost momentum through unclear transition. Lesson: clarity and stability of the repo matters. ([GitHub](https://github.com/opencode-ai/opencode))
- **Ghostty** (terminal emulator, Zig, MIT, no telemetry): 32K+ stars within 18 months. Privacy + founder credibility + MIT = rapid adoption. ([GitHub](https://github.com/ghostty-org/ghostty))
- **Better Agent Terminal** (Tauri + React, Claude Code integration): Multi-workspace terminal aggregator; recently dropped Electron. ([GitHub](https://github.com/tony1223/better-agent-terminal))

**DockTerm's open space:** No current tool combines (a) a single Claude Code terminal as the hero, (b) on-demand panels that stay out of the way, (c) beginner-safe Git with checkpoints, and (d) hard no-telemetry stance under MIT. Superset targets parallel-agent power users. DockTerm targets the single-session Claude Code user who wants safety rails.

**Show HN patterns that work:**
- Title format: "Show HN: [Name] – [technical differentiator in 8–12 words]" — under 80 characters
- Optimal timing: Tuesday–Thursday 9 AM–12 PM ET; alternative: Sunday 7 PM ET (lower competition)
- Founder posts maker comment within 5 minutes: why I built it, key technical decisions, one honest limitation
- Respond to every substantive comment in the first 60 minutes
- Aim for 30–50 upvotes in hour one; share with 10–30 trusted contacts who will give honest feedback, NOT upvotes
- Do NOT link to waitlists or marketing pages; the product must be installable on day one
- A dismissive reply to any critic can turn the thread toxic; "acknowledge, explain, link to code" is the winning pattern
([Source: daily.dev HN marketing guide](https://business.daily.dev/resources/hacker-news-marketing-developer-tools-show-hn-launch-day-sustained-coverage/))

**Contributor Covenant version status:**
Version 2.1 remains the safe, widely-adopted standard. Version 3.0 released in early 2026 — Django adopted it in April 2026. Version 3 centers impact-over-intent, adds explicit consent/boundary language, and addresses modern harassment patterns (sea-lioning, coordinated harassment). For a new project in 2026, adopting 3.0 is defensible; 2.1 is the most widely recognized and less likely to cause confusion. Recommend 3.0 with a note in the file that this is the version used. ([Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)) ([Contributor Covenant 3.0](https://www.contributor-covenant.org/version/3/0/code_of_conduct/))

---

## Risks

1. **Superset positioning collision.** Superset occupies "AI agent desktop app" space. DockTerm must make the "single-session, terminal-first, beginner-safe" distinction crisp from line one or gets lost in comparisons.
2. **Electron reputation.** Some HN commenters reflexively dismiss Electron apps as bloated. Pre-empt with honest acknowledgment: "Electron because it lets us ship a real terminal cross-platform on day one. Performance benchmarks welcome."
3. **Overpromising MCP/Skills.** These panels are V1 visibility features; they show what's configured, they do not manage a marketplace. Copy must reflect this exactly.
4. **"Beginner-safe Git" liability.** If the Git checkpoint system has a bug that causes data loss, trust collapses. README must state clearly what it does (checkpoint before destructive operations) and what it does not do (replace proper Git knowledge or guarantee correctness).
5. **No screenshots at launch.** A README without real screenshots will underperform. The asset plan must be executed before the Show HN post.
6. **Contributor Covenant 3.0 adoption friction.** It is newer; some communities will not have encountered it. Include the full text in CODE_OF_CONDUCT.md, not just a reference link.
7. **MIT license with "DockTerm contributors"** — if a sole founder is doing the initial work, using the founder's name as initial copyright holder (then transferring to "DockTerm contributors" as others join) is cleaner legally. The alternative is "DockTerm contributors" from day one, which is fine for community optics.

---

## Decisions (Recommended)

| Decision | Recommendation | Rationale |
|---|---|---|
| Tagline | "The terminal Claude Code deserves. Files, Git, MCP — on demand." | See Tagline section below |
| Privacy stance in README | Own it in paragraph 1, repeat in Security section | Ghostty's success proves this converts |
| Contributor Covenant version | 3.0 | More current, better harassment coverage, signals seriousness |
| MIT copyright holder | "DockTerm contributors" | Better community optics, avoids personal name lock-in |
| "Why not X" framing | Use; position against iTerm AND Cursor/VS Code, but charitably | Differentiates clearly without being dismissive |
| GIF in README | Yes, above fold, max 5 MB, 15s loop | Non-negotiable for conversion |
| Show HN timing | Tuesday 9 AM ET after GIF + screenshots exist | Do not launch without visual assets |
| Electron acknowledgment | Yes, brief, in Development section | Pre-empt the HN pile-on |

---

## Rejected Ideas

- **"AI-powered" anywhere in the copy.** DockTerm does not run AI; it provides a workspace to run AI. Claiming "AI-powered" would be false and would attract skepticism.
- **MCP marketplace in V1 messaging.** Explicitly future. Do not hint at it in tagline or features.
- **Enterprise security claims.** Out of scope. The security model is "local app, your machine, no server." That is the full claim.
- **"Replace your terminal"** language. DockTerm is an Electron shell around a real terminal. Saying "replace iTerm" would invite benchmarks that DockTerm cannot win on raw terminal performance.
- **Waitlist / newsletter capture.** HN audience responds badly to this. Ship the product before posting.
- **Metrics dashboard / usage analytics in roadmap** — contradicts the privacy stance. Never add, never hint.
- **Founding team photos / company branding** in README. This is a community OSS project under MIT. Keep it project-first.
- **Using OpenCode-style technical-depth-first README.** OpenCode's deep technical framing works for multi-LLM power users; DockTerm's audience includes beginners who need to feel safe. Lead with empathy, then depth.

---

## V1 Recommendations

---

### 1. Tagline: Five Candidates, One Choice

**Candidates:**

1. "The terminal Claude Code deserves. Files, Git, MCP — on demand."
2. "Run `claude`. Everything else stays out of your way."
3. "Terminal-first workspace for Claude Code. No accounts. No cloud."
4. "Claude Code lives in the terminal. Now the terminal grows around it."
5. "Your terminal runs Claude. DockTerm keeps it sane."

**Chosen tagline: "Run `claude`. Everything else stays out of your way."**

Rationale: It is nine words. It answers "what" (you run claude) and "why" (no clutter). The backtick renders on GitHub and signals a real CLI product. It does not make claims about files, Git, or MCP — those are panels that appear when needed, so they should not be crowded into the tagline. This tagline will read well on the GitHub repo description line, in a tweet, and on an HN title.

**Alternate for GitHub repo description** (which cannot render backticks): "Terminal-first workspace for Claude Code — files, Git, MCP, and skills panels on demand. No accounts. No telemetry. MIT."

---

### 2. README Blueprint

#### Exact Section Order with Guidance

---

**Section 1: Title + Tagline**
```
# DockTerm
Run `claude`. Everything else stays out of your way.
```
One line. No subtitle. The tagline does the work. Badges on the next line: license (MIT), platform (macOS · Windows), status (early v1), GitHub stars. Do not stack more than 5 badges; beyond that they slow scanning.

**Section 2: Screenshot / GIF (Above the Fold)**
Two side-by-side images or a single animated GIF (15s loop, ≤5 MB): left side shows the clean terminal state with claude running; right shows the file panel sliding in. Caption: "Terminal-first. Panels appear only when you need them." This must exist before the Show HN post. A placeholder image with [screenshot coming] will hurt conversion.

**Section 3: What is DockTerm?**
Two to three short paragraphs. Answer: what it is, what it is not, and who controls what. Include the verbatim line here:

> DockTerm is terminal-first. The terminal stays central. Panels only appear when you need them.

Draft of this section (see "Draft Opening" below).

**Section 4: Who Is It For?**
Short paragraph or 3-bullet list. Target: developers actively using Claude Code who want file access, safe Git, and MCP visibility without leaving the terminal context. Secondary: Claude Code newcomers who are intimidated by raw terminal + external Git UI juggling. Not for: iTerm power users who do not use Claude Code; VS Code users who prefer GUI-first.

**Section 5: Why Not iTerm Only? (or Any Terminal)**
One paragraph, respectful tone. "iTerm2, Ghostty, and WezTerm are excellent terminal emulators. DockTerm is not a better terminal; it's a workspace built around the session where Claude Code is running. The panels (files, Git, diff review) are only meaningful when you're working with an AI agent that's making changes to your codebase."

**Section 6: Why Not VS Code / Cursor?**
One paragraph, charitable. "Cursor and VS Code are excellent editors. DockTerm is not a code editor. If you prefer your AI agent inside an editor with IntelliSense, Cursor is the better choice. DockTerm is for developers who want the terminal to remain primary — where `claude` runs in full focus — with lightweight panels for the parts VS Code handles heavily."

**Section 7: Core Features**
Use a two-column table or a scannable list with one-line descriptions per feature. Do not use paragraphs here.

| Feature | What it does |
|---|---|
| Hero terminal | Full PTY terminal — you run `claude` here |
| File panel | Sidebar file tree for the current project; click to open in Monaco |
| Monaco editor | Edit files without leaving DockTerm |
| Git safety panel | Checkpoint before destructive operations; visual diff; one-click safe commit |
| Diff/review view | Review AI-generated changes before committing |
| MCP servers panel | See which MCP servers are configured and connected |
| Skills panel | See available Claude Code skills; launch them |
| Command palette | Keyboard-first access to all panels and actions |

**Section 8: Claude Code Workflow**
Narrative walkthrough, 100–150 words. "You open DockTerm, your terminal is front and center. You type `claude`. You give Claude Code a task. Files change. You hit the Git safety key — a checkpoint is created, diff appears, you review, you commit. The panels slide away when you're back at the prompt." Include a second GIF or screenshot of this flow if possible.

**Section 9: MCP / Skills Visibility**
One paragraph. Make the scope clear: "The MCP panel shows which MCP servers are active in your Claude Code session. It does not install servers or provide a marketplace — that is a future roadmap item. The Skills panel shows available skills and lets you trigger them. Both panels are read/trigger interfaces for V1."

**Section 10: Git Safety**
One paragraph. Be honest about scope. "DockTerm creates a Git checkpoint (stash or commit, your choice) before any destructive file operation. It shows you the diff before you commit. It does not replace understanding Git. If you need advanced Git operations, use your Git client of choice — DockTerm does not try to replace it."

**Section 11: Installation**
Three-step quick-start, copy-paste only. macOS and Windows tabs or sequential blocks. Platform-specific notes only if unavoidable. Homebrew cask, Windows installer, and build-from-source (for contributors only) as three separate sub-sections. This section should be passable by a non-technical user in under two minutes.

**Section 12: Development**
For contributors: Node.js + Electron setup, native module rebuild note (this is where the gotcha lives — see CONTRIBUTING.md), `npm run dev`, test command, `npm run build`. One-paragraph Electron acknowledgment here: "DockTerm is built on Electron. This lets us ship a real PTY terminal cross-platform without maintaining platform-specific native code. If you want to benchmark DockTerm's terminal throughput against Ghostty or Alacritty, you will win those benchmarks with a native terminal. DockTerm is not optimizing for raw throughput; it's optimizing for the Claude Code developer workflow."

**Section 13: Security Model**
Crisp and honest. "DockTerm is a local desktop application. Your code never leaves your machine through DockTerm. There is no DockTerm server, no DockTerm account, no telemetry, no analytics, no crash reporting. The only network calls DockTerm makes are the ones Claude Code makes — to Anthropic's API. DockTerm does not intercept or log these calls. See [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for the full model." Do NOT add enterprise-security language or SOC2/compliance claims.

**Section 14: Roadmap**
Link to [ROADMAP.md](ROADMAP.md). Include a one-paragraph preview: "V1 is the foundation. V1.x will focus on stability, accessibility, and Windows polish. V2 ideas include MCP health checks, per-project profiles, and a community MCP directory. None of these are committed timelines."

**Section 15: Status**
Single paragraph. "DockTerm is in early production-focused V1. It is used daily by the author for real Claude Code work. It is not battle-tested at scale. Expect rough edges. Report them in Issues." Include a badge: `early v1` and date of last release.

**Section 16: Contributing**
Short paragraph + link to [CONTRIBUTING.md](CONTRIBUTING.md). "Contributions are welcome. Read the contributing guide first — especially the native module rebuild note if you're on Windows. Open an issue before starting large work."

**Section 17: License**
`MIT License — Copyright (c) 2026 DockTerm contributors`
Link to LICENSE file.

---

#### Draft Opening: Title, Tagline, First Three Paragraphs

```markdown
# DockTerm

Run `claude`. Everything else stays out of your way.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)]()
[![Status](https://img.shields.io/badge/status-early%20v1-orange)]()

---

DockTerm is a minimal desktop workspace built for developers who run Claude Code in a
terminal. The terminal is the hero. Every other panel — files, Monaco editor, Git diff,
MCP servers, Skills — lives in a slide-in dock that appears only when you summon it and
disappears when you don't need it.

DockTerm is terminal-first. The terminal stays central. Panels only appear when you need them.

There is no DockTerm account. No telemetry. No cloud. No code leaves your machine through
DockTerm. It is MIT-licensed, open-source, and built to stay that way.
```

---

### 3. GitHub Repo Metadata

**Description string (≤120 characters):**
```
Terminal-first workspace for Claude Code — files, Git, MCP, and skills on demand. No telemetry. MIT.
```
(101 characters)

**Topics (~10):**
```
claude-code, terminal, electron, mcp, developer-tools, git, ai-coding, desktop-app, open-source, privacy
```
Optionally add: `typescript`, `monaco-editor`, `worktree`, `claude`

**Social preview guidance:**
- Size: 1280×640px (GitHub's recommended og:image dimensions)
- Dark background (terminal aesthetic; #0d0d0d or near-black)
- Terminal window mockup on the left with `claude` running (green prompt, minimal output)
- Thin panel sliding in from the right showing a file tree
- DockTerm logo/wordmark centered below
- Tagline text: "Run claude. Everything else stays out of your way."
- Do NOT include badges, version numbers, or star counts in the social preview — these become outdated; keep it purely visual/conceptual
- Use a monospace font (JetBrains Mono or similar) for any code text in the image

---

### 4. Visual Assets Plan

#### Screenshot Shot-List (4 Required Shots)

**Shot 1: Clean Terminal State**
App state: DockTerm open, terminal occupying full window width (~85% of width), claude running, responding to a natural language request. No panels visible. Shows the "terminal-first" claim in action. Caption: "The default state: terminal in full focus."

**Shot 2: File Panel + Monaco Editor Open**
App state: File panel slid in from the left (~20% width), file tree expanded showing a real project structure, Monaco editor open in the center showing a file Claude Code just modified (with visible diff highlights). Caption: "Review what changed. Edit without switching windows."

**Shot 3: Git Safety + Diff Review**
App state: Git panel active, showing diff between pre-Claude checkpoint and current state. Staged files listed. Checkpoint indicator visible ("Checkpoint created at 11:42 AM"). Commit button visible. Caption: "Checkpoint before Claude runs. Review before you commit."

**Shot 4: MCP Servers Panel + Skills Panel**
App state: Right-side dock open showing two tabs: MCP Servers (list of configured servers with status indicators: green = connected, grey = not running) and Skills (list of available skills with trigger buttons). Caption: "See your MCP tools and skills at a glance."

#### 30-Second Demo Video Script

**[0–5s] — Hook: The Pain**
Screen: Developer in a standard terminal. Claude Code is running. Files are changing. The developer alt-tabs to Finder to find the file. Then alt-tabs again to a Git GUI. Then back to the terminal. Three windows. Three context switches.
Voiceover (or title card): "You're running Claude Code. Why are you alt-tabbing?"

**[5–20s] — DockTerm Flow**
- [5s] DockTerm opens. Terminal takes up the full window. `claude` starts.
- [8s] Developer gives Claude Code a task: "refactor the auth module."
- [10s] Files start changing. Developer hits a keyboard shortcut (e.g., Cmd+Shift+F). File panel slides in smoothly. They click the changed file. Monaco shows the diff with highlights.
- [14s] Developer hits Cmd+Shift+G. Git panel opens. Checkpoint is already created. Diff is displayed. Developer reads it.
- [17s] Developer clicks "Commit." Done. Panel slides back. Terminal returns to full width.
- [19s] Title card: "No alt-tab. No context switch."

**[20–30s] — MCP/Skills Panel + Tagline**
- [20s] Developer hits Cmd+Shift+M. MCP panel opens. Three servers listed; two green, one grey.
- [23s] Developer switches to Skills tab. Clicks a skill. Returns to terminal; skill is running.
- [25s] Panel slides away. Terminal is in full focus again.
- [27s] DockTerm logo appears on screen.
- [28s] Tagline: "Run `claude`. Everything else stays out of your way."
- [30s] End card: "MIT. No telemetry. github.com/[org]/dockterm"

#### GIF-for-README Guidance

- **Length:** 12–15 seconds maximum. Shorter is better. Cut aggressively.
- **File size:** ≤5 MB. Use `gifski` or `ffmpeg` to compress. Anything larger will fail to load on slow connections and GitHub preview will show broken.
- **Content:** The Git safety flow (Shot 3 above) makes the best GIF — it shows the most "magic" in the shortest time. Terminal → checkpoint → diff → commit → terminal. One smooth loop.
- **Frame rate:** 20–24 fps is sufficient; higher does not improve GIF quality meaningfully.
- **Resolution:** 1200×750px or similar. Match the README column width.
- **Tool recommendation:** Use LICEcap (Windows/macOS) for capture; gifski for compression. Alternatively, capture MP4 at high quality and convert.
- **Hosting:** Commit the GIF to the repo in `docs/assets/` and reference with a relative path. Do not use external hosting — links rot.

---

### 5. Community Files: Outlines

#### CONTRIBUTING.md Outline

1. **Welcome + Philosophy** — brief paragraph: "We build DockTerm to make Claude Code developers more effective. Contributions that serve that mission are welcome."
2. **Before You Start** — open an issue before large work; small fixes (typos, docs) can go straight to PR
3. **Development Setup — macOS**
   - Prerequisites: Node.js 20+, npm, Xcode Command Line Tools
   - Clone, `npm install`, `npm run dev`
   - Note on native modules (node-pty): after `npm install`, run `npm run rebuild` if the terminal fails to start. This is the most common setup failure.
4. **Development Setup — Windows**
   - Prerequisites: Node.js 20+, Windows Build Tools (`npm install --global windows-build-tools`)
   - Visual C++ Build Tools requirement (link to installer)
   - node-pty rebuild: `npm run rebuild` required after install; document the exact error message developers will see if they miss this step
   - PowerShell execution policy note if relevant
5. **Code Style** — Prettier + ESLint; run `npm run lint` before committing; config files are in repo root
6. **Testing** — how to run tests; what coverage is expected for new features
7. **PR Rules** — small focused PRs; one concern per PR; link to the issue; describe testing done; screenshots for UI changes
8. **Commit Message Style** — conventional commits (feat:, fix:, docs:, chore:) with brief example
9. **Native Module Rebuild Note** (repeated as standalone section with header) — this is the single most common contributor failure point; it deserves its own header so it is findable via Ctrl+F

#### SECURITY.md Outline

1. **Scope** — DockTerm is a local desktop application; the security surface is the local machine only; there is no server, no API, no network endpoint owned by DockTerm
2. **What DockTerm Does and Does Not Do** — does: run a PTY terminal, read/write local files, invoke git locally; does not: transmit code, log keystrokes, collect telemetry, make network calls on its own
3. **Supported Versions** — V1.x (current); older versions will not receive security patches; upgrade policy
4. **Reporting a Vulnerability** — use GitHub Security Advisories (private reporting); do not open a public issue for security vulnerabilities; link: Settings > Security > Advisories
5. **Response Timeline** — acknowledge within 72 hours; assess within 7 days; fix timeline depends on severity
6. **Out of Scope** — vulnerabilities in Claude Code itself (report to Anthropic); vulnerabilities in Electron (report to Electron maintainers); social engineering; physical access attacks

#### CODE_OF_CONDUCT.md Outline

1. Use **Contributor Covenant 3.0** (current as of 2026) — include the full text, do not reference-link only
2. Add a project-specific note at the top: "DockTerm is a welcoming community. We use the Contributor Covenant 3.0 as our code of conduct."
3. Fill in enforcement contact: the project maintainer's GitHub handle or a dedicated email address
4. Include the enforcement section with clear escalation path

**Note on version choice:** Contributor Covenant 2.1 is the most widely recognized version and is safe to use. Version 3.0 (adopted by Django in April 2026) adds explicit consent/boundary language and better covers modern harassment patterns including coordinated harassment. For a new project launching in 2026, 3.0 is the forward-looking choice. Either is acceptable; the recommendation here is 3.0 with the full text included in the file.

#### LICENSE Outline

- License: **MIT**
- Copyright line: `Copyright (c) 2026 DockTerm contributors`
- Rationale: "DockTerm contributors" is the right holder name. Using the founder's personal name creates friction when other contributors join and creates a false impression of a personal project. Using "DockTerm contributors" signals community ownership from day one, is consistent with how major OSS projects (Ghostty: "DockTerm contributors" analog, Electron: "Electron contributors") handle this, and avoids requiring copyright assignment agreements.
- Include the standard MIT body text (no modifications).

#### ROADMAP.md Structure

1. **V1 — Shipped**
   - Core terminal (PTY, full color, resize)
   - File panel + Monaco editor
   - Git safety panel (checkpoint, diff view, commit)
   - MCP servers panel (visibility only)
   - Skills panel (list + trigger)
   - Command palette
   - macOS + Windows support
   
2. **V1.x — Near-Term (no committed dates)**
   - Windows polish (installer, native look)
   - Accessibility improvements (keyboard navigation, screen reader support)
   - Terminal themes
   - Configurable panel layout persistence
   - Git: branch switching from the panel
   - Bug fixes and stability

3. **V2 — Ideas (no committed dates; subject to change)**
   - MCP health checks (detect broken server configs)
   - MCP tool list visibility (see available tools per server)
   - Community MCP directory / marketplace integration
   - Per-project profiles (saved panel layouts, MCP configs)
   - Multi-session support (tabs or split views)
   - Plugin/extension API

**Note:** The roadmap must include a clear disclaimer: "V2 items are ideas, not commitments. They may change, be dropped, or be replaced based on community feedback and real usage."

---

### 6. docs/ Plan: Purpose Statements

**docs/ARCHITECTURE.md**
Documents how DockTerm is structured as an Electron application: the main process (PTY management, file system access, Git operations, IPC), the renderer process (React UI, panel state, Monaco editor), and the communication layer between them. Explains why each architectural decision was made — including the Electron choice, the panel slide-in design, and how the terminal is embedded. This document is for contributors who want to understand the codebase before making changes, and for developers evaluating whether to fork or extend DockTerm.

**docs/SECURITY_MODEL.md**
A detailed companion to SECURITY.md. Documents the full threat model for DockTerm as a local application: what data DockTerm accesses (local filesystem, git history, process environment), what it does not access (clipboard beyond explicit paste, other processes, network), and what the trust boundaries are (DockTerm trusts the local user; it does not sandbox Claude Code's operations). Explains why "no telemetry" is an architectural property, not a configuration option: the telemetry code does not exist. Also documents the Electron version policy and how native dependency security is managed.

**docs/PRODUCT_PLAN.md**
The internal product thinking document: what problem DockTerm solves, who the target user is (solo developer, daily Claude Code user, not enterprise), what DockTerm explicitly is not (iTerm replacement, Cursor replacement, MCP server manager), and how product decisions are made (community-first, working-group model, no VC pressure). This document helps contributors understand why features are accepted or rejected, and serves as the north star for roadmap decisions. It is the written version of "what would DockTerm say no to?"

**docs/ROADMAP.md**
The detailed version of the top-level ROADMAP.md, with additional context on each roadmap item: what user problem it solves, what technical challenges exist, what alternatives were considered, and what "done" looks like. The top-level ROADMAP.md is the scannable summary; this file is for contributors who want to work on a roadmap item and need context before starting. Each V2 item includes a "why this is future, not now" note to prevent premature implementation.

---

### 7. Launch Plan

#### Show HN Title Candidates (3)

1. `Show HN: DockTerm – Terminal-first workspace for Claude Code with on-demand panels`
   (79 characters — within the <80 sweet spot; technical, specific)

2. `Show HN: DockTerm – Run claude in a terminal, get files/Git/MCP panels on demand`
   (82 characters — slightly long but highly specific to the workflow)

3. `Show HN: DockTerm – A minimal Electron workspace around Claude Code. No telemetry, MIT`
   (89 characters — leads with the differentiators that HN cares about: minimal, no telemetry, MIT)

**Recommended:** Option 1. It is under 80 characters, uses "terminal-first" which is the positioning anchor, names Claude Code (which HN readers recognize), and "on-demand panels" is specific enough to intrigue without overselling.

**Maker comment structure:**
- Paragraph 1: What it is and why I built it. "I've been running Claude Code daily for X months. Every time a file changed I was alt-tabbing to Finder. Every time I wanted to commit I was switching to a Git GUI. DockTerm is the workspace I wanted to exist."
- Paragraph 2: What it is NOT. "This is not an iTerm replacement. The terminal performance is Electron. This is not a Cursor replacement — there's no IntelliSense, no language server integration beyond what the terminal provides. The bet is that Claude Code users want the terminal to be primary."
- Paragraph 3: Technical decisions. "Built on Electron because PTY cross-platform. React for the panels. Monaco for the editor. No backend. No accounts. No telemetry — not opt-out, just absent."
- Paragraph 4: Honest limitation. "V1 is early. The Git safety panel is the part I'm least confident in — I've used it on real projects but I would not call it battle-tested. If you find a case where it does the wrong thing, please file an issue immediately."
- Close: GitHub link, MIT, contributing welcome.

#### r/ClaudeAI Post Angle

Post title: "I built a desktop workspace for Claude Code — terminal stays front and center, panels slide in only when you need them (files, Git, MCP). MIT, no telemetry."

Angle: Personal story first. "I kept alt-tabbing between my terminal, Finder, and a Git GUI while Claude Code was running. After the third time in an hour I started building DockTerm." Lead with the frustration, not the features. Include the GIF in the post. Ask for feedback explicitly: "What's missing from V1? What would make this useful for your workflow?"

Do not post to r/ClaudeAI and r/programming on the same day as the Show HN — HN users cross-post detection makes this look like vote manipulation even when it is not. Wait 48–72 hours after HN before posting to Reddit.

#### X / Twitter Thread Beats (5 Tweets)

**Tweet 1 (Hook — the pain):**
"Every time Claude Code touches a file, I was alt-tabbing to Finder. Then to a Git GUI. Then back to the terminal. Three windows for one task. So I built DockTerm. 🧵"

**Tweet 2 (What it is):**
"DockTerm is a terminal workspace for Claude Code users. The terminal is full-screen. Files, Git diffs, MCP servers, and skills live in panels that slide in when you need them and disappear when you don't. [GIF of the clean terminal → panel → commit → terminal flow]"

**Tweet 3 (The Git safety bit — most tweetable feature):**
"My favorite part: before Claude Code makes a destructive change, DockTerm checkpoints your Git state automatically. Then shows you the diff before you commit. I have reverted three 'oops' moments in two weeks of dogfooding."

**Tweet 4 (Privacy stance — the differentiator):**
"No DockTerm account. No telemetry. No analytics. Not opt-out — just absent. Your code doesn't leave your machine through DockTerm. MIT license. The whole thing is on GitHub."

**Tweet 5 (Call to action):**
"V1 is early. I use it daily on real projects. It has rough edges. If you're a daily Claude Code user and you've been wishing for something like this, try it and tell me what's wrong. [GitHub link] #ClaudeCode #OpenSource"

**Threading advice:** Post all 5 tweets in a single thread. Space Tweet 1 live; the rest are scheduled in the composer as a thread. Do not add promotional hashtags beyond #ClaudeCode and #OpenSource — over-tagging reduces engagement on X with developer audiences.

#### Timing Advice

- **Do not launch before screenshots and GIF exist.** A text-only README gets less than a third of the engagement of one with a GIF above the fold.
- **Show HN first.** Tuesday or Wednesday, 9–10 AM ET. HN is the highest-leverage single post for a developer tool.
- **X thread same day** — post the thread 1–2 hours after the HN post goes live. Cross-reference the HN discussion.
- **r/ClaudeAI 48–72 hours later.** Different audience, different post style (more personal, less technical).
- **Product Hunt** — only if you can get a hunter with a real following to post it. Self-posting on PH with no existing following rarely breaks 100 upvotes. Delay PH until someone organic offers, or skip V1 and return for a V1.1 milestone.
- **Star history chart in README:** Add after the first 50 stars. It looks bad if the chart shows a flatline; wait for momentum.

#### What NOT to Claim Anywhere (Overpromising List)

These claims must never appear in the README, Show HN post, tweets, or r/ClaudeAI post:

- "AI-powered" — DockTerm is not AI; it runs Claude Code, which is AI
- "Replace your terminal" / "better than iTerm" — do not make terminal emulator comparisons
- "Replace VS Code" / "replace Cursor" — do not make editor comparisons
- "Enterprise-ready" / "production security" — not tested at that scale, no SOC2
- "MCP marketplace" — does not exist in V1
- Any specific performance benchmarks (startup time, memory, throughput) unless you have measured them and they are favorable — Electron is known to lose these comparisons
- "Used by thousands of developers" (until true)
- "Stable" or "mature" — use "early v1" language consistently
- Any claim about what Claude Code will or will not do — DockTerm does not control Claude Code behavior
- "No bugs" / "battle-tested" — say "dogfooded daily on real projects, rough edges expected"
- "Private beta" / "waitlist" — ship it or don't post it

---

## Sources Cited

- [GitHub README 2026 Guide — dev.to](https://dev.to/iris1031/github-readme-template-the-complete-2026-guide-to-get-more-stars-3ck2)
- [Show HN marketing guide — daily.dev](https://business.daily.dev/resources/hacker-news-marketing-developer-tools-show-hn-launch-day-sustained-coverage/)
- [Ghostty launch post — Mitchell Hashimoto](https://mitchellh.com/writing/ghostty-is-coming)
- [Ghostty GitHub](https://github.com/ghostty-org/ghostty)
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [Superset GitHub](https://github.com/superset-sh/superset)
- [AnythingLLM GitHub](https://github.com/mintplex-labs/anything-llm)
- [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
- [Contributor Covenant 3.0](https://www.contributor-covenant.org/version/3/0/code_of_conduct/)
- [Django adopts Contributor Covenant 3](https://www.djangoproject.com/weblog/2026/apr/15/contributor-covenant-adoption/)
- [GitHub CLI adds telemetry by default](https://www.techzine.eu/news/devops/140736/github-cli-now-collects-usage-data-by-default/)
- [Superset Show HN](https://news.ycombinator.com/item?id=46368739)
- [Nova AI terminal Show HN](https://news.ycombinator.com/item?id=47244492)
- [Deff Show HN](https://news.ycombinator.com/item?id=47169518)
- [Top rising GitHub projects 2026 — apidog](https://apidog.com/blog/top-rising-github-projects/)
- [Awesome README examples](https://github.com/matiassingers/awesome-readme)
- [Ghostty vs Warp AI CLI 2026 — termdock](https://www.termdock.com/en/blog/best-terminal-emulator-ai-cli-2026)
- [Agent-aware terminals 2026 — codex.danielvaughan.com](https://codex.danielvaughan.com/2026/04/29/agent-aware-terminals-codex-cli-warp-cmux-ghostty-choosing-terminal-emulator/)
