import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { safeUrl, keysOf } from './secretMask'
import type { McpServerView, McpSource, McpReadResult, McpTransport, McpScope } from '@shared/types'

const MCP_TEMPLATE = `{
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
`

function inferTransport(def: Record<string, unknown>): McpTransport {
  const type = typeof def.type === 'string' ? def.type.toLowerCase() : ''
  if (type === 'http' || type === 'sse' || type === 'stdio') return type
  if (typeof def.command === 'string') return 'stdio'
  if (typeof def.url === 'string') return 'http'
  return 'unknown'
}

function parseServers(raw: unknown, scope: McpScope, sourcePath: string): McpServerView[] {
  const servers: McpServerView[] = []
  const mcp = (raw as { mcpServers?: unknown } | null)?.mcpServers
  if (!mcp || typeof mcp !== 'object') return servers

  for (const [name, value] of Object.entries(mcp as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const def = value as Record<string, unknown>
    const view: McpServerView = {
      name,
      scope,
      transport: inferTransport(def),
      envKeys: keysOf(def.env),
      headerKeys: keysOf(def.headers),
      sourcePath
    }
    if (typeof def.command === 'string') {
      const args = Array.isArray(def.args) ? def.args.map((a) => String(a)) : []
      view.command = [def.command, ...args].join(' ')
    }
    if (typeof def.url === 'string') view.url = safeUrl(def.url)
    servers.push(view)
  }
  return servers
}

function readInto(
  file: string,
  scope: McpScope,
  sources: McpSource[],
  servers: McpServerView[]
): void {
  if (!existsSync(file)) {
    sources.push({ path: file, scope, exists: false, ok: true })
    return
  }
  try {
    const text = readFileSync(file, 'utf8').replace(/^﻿/, '')
    servers.push(...parseServers(JSON.parse(text), scope, file))
    sources.push({ path: file, scope, exists: true, ok: true })
  } catch {
    sources.push({ path: file, scope, exists: true, ok: false, error: 'Could not parse JSON' })
  }
}

/**
 * Reads `~/.claude.json`, which holds MCP servers in TWO places:
 *  - top-level `mcpServers`        → "user" scope (added with `claude mcp add -s user`)
 *  - `projects[<root>].mcpServers` → "local" scope (the DEFAULT for `claude mcp add`)
 * The local block is what most users actually have, so we surface both.
 */
function readUserConfig(
  file: string,
  projectRoot: string,
  sources: McpSource[],
  servers: McpServerView[]
): void {
  if (!existsSync(file)) {
    sources.push({ path: file, scope: 'user', exists: false, ok: true })
    return
  }
  try {
    const text = readFileSync(file, 'utf8').replace(/^﻿/, '')
    const json = JSON.parse(text) as { projects?: Record<string, unknown> }
    servers.push(...parseServers(json, 'user', file))
    const projects = json.projects
    if (projects && typeof projects === 'object') {
      // Match the current project's entry, tolerating a trailing-slash difference.
      const key = Object.keys(projects).find(
        (k) => k === projectRoot || k.replace(/[/\\]+$/, '') === projectRoot.replace(/[/\\]+$/, '')
      )
      if (key) servers.push(...parseServers(projects[key], 'local', file))
    }
    sources.push({ path: file, scope: 'user', exists: true, ok: true })
  } catch {
    sources.push({ path: file, scope: 'user', exists: true, ok: false, error: 'Could not parse JSON' })
  }
}

/** Reads configured MCP servers. User scope (~/.claude.json) is only read when
 * `includeUser` is true — the handler additionally gates this on the user's
 * opt-in setting. Secret values are never returned; only key names and a
 * credential-stripped URL leave the main process. */
export function readMcp(root: string, includeUser: boolean): McpReadResult {
  const sources: McpSource[] = []
  const servers: McpServerView[] = []
  readInto(join(root, '.mcp.json'), 'project', sources, servers)
  if (includeUser) {
    readUserConfig(join(homedir(), '.claude.json'), root, sources, servers)
  }
  return { servers, sources }
}

export function createMcpTemplate(root: string): string {
  const file = join(root, '.mcp.json')
  if (existsSync(file)) throw new Error('.mcp.json already exists')
  writeFileSync(file, MCP_TEMPLATE, { flag: 'wx' })
  return '.mcp.json'
}
