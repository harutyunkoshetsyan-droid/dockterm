# MCP & Skills Config Research

> Produced by the MCP/Skills research agent (claude-code-guide), 2026-06-11.
> Verified against official Claude Code docs (code.claude.com/docs) and the local
> Claude Code 2.1.173 installation (structure only — no secret values were read or echoed).

## Findings

### 1. MCP Configuration Locations & Scopes

**Three scope levels (CLI docs: https://code.claude.com/docs/en/mcp-quickstart.md, https://code.claude.com/docs/en/mcp.md):**

| Scope | File | Available to | Shared |
|-------|------|--------------|--------|
| **local** | `~/.claude.json` (Windows: `%USERPROFILE%\.claude.json`), under project-specific key | Only you, only current project | No |
| **project** | `.mcp.json` (repository root) | All clones of repo; requires one-time approval | Yes (git commit) |
| **user** | `~/.claude.json`, top-level `mcpServers` key | You, all projects | No |

**Environment override:** `CLAUDE_CONFIG_DIR` can redirect `~/.claude.json` to a custom path.

**JSON Schema for .mcp.json (project scope):**

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio" | "http",
      "command": "executable",
      "args": ["arg1", "arg2"],
      "url": "https://example.com/mcp",
      "env": { "KEY": "value" },
      "headers": { "Auth": "Bearer ..." }
    }
  }
}
```

- `command`/`args`/`env` apply to stdio servers; `url`/`headers` apply to http servers.

**Scope merging:** Servers in project scope require approval before use (blocking UX prompt in Claude Code). User-scoped servers apply to all projects. Local-scoped servers are tied to the exact project directory.

**`claude mcp` commands:**

- `claude mcp add [--scope user|project|local] [--transport http|stdio] <name> <url-or-command>` — saves to the appropriate file
- `claude mcp list` — reads config; per current docs it reports configured servers (the in-session `/mcp` command is what performs live health checks by connecting to servers). **Caution:** treat any CLI invocation as potentially process-spawning; DockTerm V1 must never auto-execute Claude CLI commands.
- `claude mcp get <name>` — returns which scope holds the definition
- `claude mcp remove <name> [--scope ...]`
- No `--json` flag documented; output is a human-readable table.

### 2. Sensitivity of `~/.claude.json`

**Keys present (by NAME only; empirical + docs):**

- `numStartups`, `installMethod`, `autoUpdates` (app state)
- `tipsHistory`, `promptQueueUseCount`, `cachedGrowthBookFeatures` (UI/feature toggles)
- **`mcpServers`** (user-scoped MCP definitions; may contain env vars, URLs, tokens)
- **Per-project state:** project-specific approval flags, tool allowlists, trust settings
- **OAuth session tokens & authentication credentials**
- Various internal caches

**Justification for DockTerm opt-in gate:** `~/.claude.json` contains active session tokens, per-project approval state, and per-MCP-server environment variables (API keys). Not suitable for automated enumeration without user consent.

### 3. `~/.claude.json` vs `~/.claude/settings.json`

Two separate user-scope files (NOT the same file):

- **`~/.claude.json`** — app state, sessions, caches, sensitive auth (NOT a settings file)
- **`~/.claude/settings.json`** — user-scope settings: permissions, hooks, env vars, plugins

Windows paths: `%USERPROFILE%\.claude.json` and `%USERPROFILE%\.claude\settings.json`.

### 4. Skills & Commands Structure

**Directory structure (https://code.claude.com/docs/en/skills.md, https://code.claude.com/docs/en/claude-directory.md):**

```
Project scope:
  .claude/skills/skill-name/SKILL.md          (required; main skill body)
  .claude/skills/skill-name/<support files>   (optional)
  .claude/commands/command-name.md            (legacy; still works)

User scope (~/.claude):
  ~/.claude/skills/skill-name/SKILL.md
  ~/.claude/commands/command-name.md
```

**Invocation:** `/skill-name`, or Claude's automatic selection unless `disable-model-invocation: true`.

**SKILL.md frontmatter schema:**

```markdown
---
name: <name>
description: <one-liner used for invocation decisions>
disable-model-invocation: false | true
allowed-tools: [Tool1, Tool2]      # optional
model: <model-id>                  # optional
tags: [tag1, tag2]                 # optional
---
# Skill body (markdown instructions)
```

**Discovery:** Claude Code reads `.claude/skills/*/SKILL.md` and `~/.claude/skills/*/SKILL.md` at startup. `/skills` lists all available skills. Plugin-provided skills also appear there.

**Commands/skills equivalence:** `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` both create `/deploy`. Commands are the older mechanism; skills are the modern one (support files, frontmatter control, auto-invocation).

### 5. Custom Slash Commands (Legacy)

- Location: `~/.claude/commands/name.md`, `.claude/commands/name.md`
- Plain markdown; frontmatter (`description`, etc.) interpreted if present
- Arguments arrive via `$ARGUMENTS` substitution
- Subdirectories namespace commands
- Project scope overrides user scope for same name

### 6. Hooks Configuration

**File locations & precedence (https://code.claude.com/docs/en/hooks.md):**

| Location | Scope | Precedence |
|----------|-------|-----------|
| `~/.claude/settings.json` | User (all projects) | Lowest |
| `.claude/settings.json` | Project (shared) | Middle |
| `.claude/settings.local.json` | Local (machine-specific) | Highest |
| Plugin `hooks/hooks.json` | When plugin enabled | merged |
| Managed policy settings | Organization-wide | Overrides all |

**Hook event names (non-exhaustive):** `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `Notification`, `PreCompact`, `SubagentStart`, `SubagentStop`, and more.

**Hook definition structure:** `{ "hooks": { "EventName": [ { "matcher": "...", "hooks": [ { "type": "command", "command": "...", "timeout": 30 } ] } ] } }`

### 7. Plugins

- Plugins may provide skills, commands, hooks, and MCP servers
- Enabled/disabled via `settings.json` key `enabledPlugins`
- On-disk plugin layout is not officially documented for third-party enumeration — do not depend on it

### 8. Settings Scope Precedence (highest → lowest)

1. Managed settings (enterprise)
2. Command-line flags
3. `.claude/settings.local.json`
4. `.claude/settings.json`
5. `~/.claude/settings.json`

Permissions arrays are deep-merged across scopes (allow/deny concatenate). Settings files are watched and hot-reloaded by Claude Code.

## Risks

1. **`~/.claude.json` is highly sensitive** — session tokens, approval state, MCP env vars. Explicit user consent required before reading.
2. **CLI behavior is version-dependent** — docs suggest `claude mcp list` is config-read-only while `/mcp` performs live connections, but this is not guaranteed across versions. DockTerm must never auto-execute Claude CLI commands; parse files only.
3. **Project `.mcp.json` can specify arbitrary commands** — a malicious repo's `.mcp.json` can name any executable. DockTerm must parse only, never execute, and display stdio commands plainly so users see exactly what is configured.
4. **Scope confusion** — `~/.claude.json` ≠ `~/.claude/settings.json`. Do not conflate.
5. **Secrets in `env` and `headers`** — must be masked in all UI display.

## Decisions (recommended)

### Safe-inspection tiers

**Tier 1 — safe by default (project-local, team-shared by design):**
- `.mcp.json` (project)
- `.claude/settings.json` (project)
- `.claude/skills/*/SKILL.md` (project)
- `.claude/commands/*.md` (project)

**Tier 2 — explicit opt-in required (user-private):**
- `~/.claude.json` (most sensitive)
- `~/.claude/settings.json`
- `~/.claude/skills/*/SKILL.md`, `~/.claude/commands/*.md`

### Masking rules (always, both tiers)

- Mask all `env.*` values (show key names only)
- Mask all `headers.*` values (show key names only)
- Mask any value matching `/token|secret|key|api.?key|authorization|bearer|password/i`
- URLs: if credentials are embedded (`user:pass@`), show host only; consider host-only display generally
- stdio `command` + `args` shown as-is (informational, not secret) — but still rendered as inert text, never executed

## Rejected ideas

1. ~~Enumerate plugin internals by reading `~/.claude/plugins/` directly~~ — undocumented layout; brittle.
2. ~~Parse `~/.claude.json` at startup~~ — opt-in only; project `.mcp.json` is the default source of truth.
3. ~~Display hook bodies in UI~~ — V1 shows nothing or counts only; bodies are scripts and noisy.
4. ~~Add/edit MCP servers from DockTerm UI~~ — V1 is read-only inspection + template creation; `claude mcp add` is the canonical write path.
5. ~~Cache MCP/skills lists across sessions~~ — always re-parse from disk; configs change.

## V1 recommendations

1. Parse project `.mcp.json` → list servers with masking; label source file.
2. Parse project `.claude/skills/*/SKILL.md` + `.claude/commands/*.md` → names, descriptions, slash names, source path.
3. User-scope reading (both `~/.claude.json` mcpServers and `~/.claude/skills`) strictly behind a settings toggle, default OFF.
4. Buttons: Refresh; Open `.mcp.json`; Create `.mcp.json` from template; Copy `claude mcp add ...` snippet (for the user to run themselves).
5. Educational copy: "MCP servers connect Claude Code to tools, data sources, and APIs." + trust warning re: prompt injection.
6. Never execute anything from these panels in V1. No health checks, no CLI invocation.

### Minimal `.mcp.json` template to ship

```json
{
  "mcpServers": {
    "example-http": {
      "type": "http",
      "url": "https://mcp.example.com/endpoint"
    },
    "example-stdio": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@example/mcp@latest"]
    }
  }
}
```

## Sources

- https://code.claude.com/docs/en/mcp.md
- https://code.claude.com/docs/en/mcp-quickstart.md
- https://code.claude.com/docs/en/settings.md
- https://code.claude.com/docs/en/skills.md
- https://code.claude.com/docs/en/commands.md
- https://code.claude.com/docs/en/hooks.md
- https://code.claude.com/docs/en/claude-directory.md
- https://agentskills.io (Agent Skills standard referenced by Claude Code docs)
