import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConfigStore } from '@main/services/configStore'

interface Cfg {
  a: number
  b: string
}
const defaults: Cfg = { a: 1, b: 'x' }

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dockterm-cfg-'))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('ConfigStore', () => {
  it('returns defaults when no file exists', () => {
    const store = new ConfigStore(join(dir, 'c.json'), defaults)
    expect(store.get()).toEqual(defaults)
  })

  it('persists updates atomically and reloads them', () => {
    const p = join(dir, 'c.json')
    new ConfigStore(p, defaults).update({ a: 42 })
    expect(existsSync(p)).toBe(true)
    const reloaded = new ConfigStore(p, defaults)
    expect(reloaded.get()).toEqual({ a: 42, b: 'x' })
  })

  it('recovers from a corrupt file by backing it up and using defaults', () => {
    const p = join(dir, 'c.json')
    writeFileSync(p, '{ not valid json', 'utf8')
    const store = new ConfigStore(p, defaults)
    expect(store.get()).toEqual(defaults)
    expect(existsSync(`${p}.bak`)).toBe(true)
  })

  it('runs the migrate function over raw data', () => {
    const p = join(dir, 'c.json')
    writeFileSync(p, JSON.stringify({ a: 5 }), 'utf8')
    const store = new ConfigStore<Cfg>(p, defaults, (raw) => ({ ...defaults, ...(raw as object) }))
    expect(store.get()).toEqual({ a: 5, b: 'x' })
  })
})
