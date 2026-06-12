import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { getProjectRoot } from './projectContext'
import { safeUrl, keysOf } from './secretMask'
import type { McpServerView, McpSource, McpReadResult, McpTransport } from '@shared/types'

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

function parseServers(raw: unknown, scope: 'project' | 'user', sourcePath: string): McpServerView[] {
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
  scope: 'project' | 'user',
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

/** Reads configured MCP servers. User scope (~/.claude.json) is only read when
 * `includeUser` is true — the handler additionally gates this on the user's
 * opt-in setting. Secret values are never returned; only key names and a
 * credential-stripped URL leave the main process. */
export function readMcp(includeUser: boolean): McpReadResult {
  const sources: McpSource[] = []
  const servers: McpServerView[] = []
  readInto(join(getProjectRoot(), '.mcp.json'), 'project', sources, servers)
  if (includeUser) {
    readInto(join(homedir(), '.claude.json'), 'user', sources, servers)
  }
  return { servers, sources }
}

export function createMcpTemplate(): string {
  const file = join(getProjectRoot(), '.mcp.json')
  if (existsSync(file)) throw new Error('.mcp.json already exists')
  writeFileSync(file, MCP_TEMPLATE, { flag: 'wx' })
  return '.mcp.json'
}
