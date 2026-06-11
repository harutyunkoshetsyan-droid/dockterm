import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveInside, isInside, JailViolation } from '@main/services/pathJail'

let root: string

beforeAll(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'dockterm-jail-')))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src', 'a.txt'), 'hi')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('resolveInside', () => {
  it('resolves a relative path inside the root', () => {
    expect(resolveInside(root, 'src/a.txt')).toBe(join(root, 'src', 'a.txt'))
  })

  it('resolves a not-yet-existing path inside the root (for new files)', () => {
    expect(resolveInside(root, 'src/new/deep.txt')).toBe(join(root, 'src', 'new', 'deep.txt'))
  })

  it('rejects parent-directory traversal', () => {
    expect(() => resolveInside(root, '../secret.txt')).toThrow(JailViolation)
  })

  it('rejects an absolute path outside the root', () => {
    const outside = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc/passwd'
    expect(() => resolveInside(root, outside)).toThrow(JailViolation)
  })

  it('allows an absolute path that is already inside the root', () => {
    expect(resolveInside(root, join(root, 'src', 'a.txt'))).toBe(join(root, 'src', 'a.txt'))
  })

  it('rejects a symlink/junction that escapes the root', () => {
    let made = false
    try {
      symlinkSync(tmpdir(), join(root, 'escape'), 'junction')
      made = true
    } catch {
      // no privilege to create links on this machine; skip the assertion
    }
    if (made) {
      expect(() => resolveInside(root, 'escape/whatever.txt')).toThrow(JailViolation)
    }
  })
})

describe('isInside', () => {
  it('treats the root as inside itself', () => {
    expect(isInside(root, root)).toBe(true)
  })
  it('rejects a sibling directory', () => {
    expect(isInside(join(root, 'a'), join(root, 'b'))).toBe(false)
  })
})
