import { describe, it, expect } from 'vitest'
import { safeUrl, isSecretKey, keysOf } from '@main/services/secretMask'

describe('safeUrl', () => {
  it('keeps scheme, host, and path', () => {
    expect(safeUrl('https://mcp.example.com/endpoint')).toBe('https://mcp.example.com/endpoint')
  })
  it('drops query strings (which may carry tokens)', () => {
    expect(safeUrl('https://mcp.example.com/x?token=abc123')).toBe('https://mcp.example.com/x')
  })
  it('drops embedded credentials', () => {
    expect(safeUrl('https://user:pass@mcp.example.com/')).toBe('https://mcp.example.com')
  })
  it('never leaks embedded credentials or query tokens', () => {
    const masked = safeUrl('https://user:supersecret@host.com/p?token=abc123')
    expect(masked).not.toContain('supersecret')
    expect(masked).not.toContain('abc123')
  })
})

describe('isSecretKey', () => {
  it('flags common secret keys', () => {
    expect(isSecretKey('API_KEY')).toBe(true)
    expect(isSecretKey('Authorization')).toBe(true)
    expect(isSecretKey('GITHUB_TOKEN')).toBe(true)
  })
  it('does not flag innocuous keys', () => {
    expect(isSecretKey('PORT')).toBe(false)
    expect(isSecretKey('NODE_ENV')).toBe(false)
  })
})

describe('keysOf', () => {
  it('returns object keys', () => {
    expect(keysOf({ A: '1', B: '2' })).toEqual(['A', 'B'])
  })
  it('returns empty for non-objects', () => {
    expect(keysOf(undefined)).toEqual([])
    expect(keysOf(['a'])).toEqual([])
    expect(keysOf('x')).toEqual([])
  })
})
