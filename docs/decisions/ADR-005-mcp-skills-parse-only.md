# ADR-005: MCP & Skills panels are parse-only inspectors

- **Status:** Accepted (pending /ultraplan approval)
- **Date:** 2026-06-11
- **Inputs:** docs/research/06-mcp-skills.md

## Context

DockTerm shows which MCP servers / skills / commands Claude Code can use. Three ways to learn
that: (a) parse config files, (b) run Claude CLI commands, (c) speak MCP to the servers.
MCP stdio entries are *arbitrary executables*; connecting or listing-with-health-checks can
execute code. `~/.claude.json` additionally contains OAuth/session material and per-project
state.

## Decision

**Parse-only, two consent tiers, mask always, execute never.**

- **Tier 1 (default):** project files — `.mcp.json`, `.claude/settings.json`,
  `.claude/skills/*/SKILL.md`, `.claude/commands/*.md`.
- **Tier 2 (settings toggle, default OFF):** user files — `~/.claude.json` (mcpServers key
  only), `~/.claude/settings.json`, `~/.claude/skills`, `~/.claude/commands`. Read-only.
- **Masking (all tiers, no reveal in V1):** all `env.*` and `headers.*` values; any value
  matching `/token|secret|key|api.?key|authorization|bearer|password/i`; URLs shown
  host-only when credentials are embedded. stdio `command`+`args` rendered as inert text.
- **Never executed in V1:** MCP servers, `claude mcp list` (any CLI), health checks, hooks.
  The panel offers *copyable* `claude mcp add ...` snippets for the user's own terminal.
- Write capability is limited to creating a template `.mcp.json` / skill / command file in
  the project (inside the fs jail, user-initiated).
- Panel carries the educational line ("MCP servers connect Claude Code to tools, data
  sources, and APIs.") and the trust warning (prompt-injection risk of untrusted servers).

## Consequences

- Status column is honest: `configured` / `file missing` / `parse error` — never "connected"
  (we can't know without executing). "Health" is a V2 feature behind explicit user action.
- Claude Code config formats may drift between versions → parsers are defensive
  (unknown keys tolerated, malformed JSON → friendly error state) with fixture tests.

## Alternatives rejected

- **Run `claude mcp list` automatically:** version-dependent behavior; may spawn servers;
  no `--json`. Even "probably safe" is the wrong default for an app promising safety.
- **Connect as an MCP client:** literally executing configured commands. V2-at-earliest,
  behind per-server explicit consent.
- **Parse `~/.claude.json` by default:** it holds tokens and cross-project state; opt-in only.
