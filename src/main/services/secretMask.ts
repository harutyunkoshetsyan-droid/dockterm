/** Display mask for any secret value. The renderer never receives the value. */
export const MASK = '••••••••'

const SECRET_KEY_RE =
  /(token|secret|key|api[_-]?key|authorization|bearer|password|passwd|credential|cookie|session)/i

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key)
}

/**
 * Reduce a URL to scheme + host + path — dropping any embedded credentials,
 * query string, and fragment (MCP URLs sometimes carry tokens in the query).
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname && u.pathname !== '/' ? u.pathname : ''
    return `${u.protocol}//${u.host}${path}`
  } catch {
    return url.replace(/(\/\/)[^/@]*@/, '$1' + MASK + '@')
  }
}

/** Key names of a record (env/headers). Values are never returned. */
export function keysOf(value: unknown): string[] {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : []
}
