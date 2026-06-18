import { describe, it, expect } from 'vitest'
import { exceedsWatchBudget, countDirsBounded, WATCH_DIR_CAP } from '@main/services/watchPolicy'

describe('exceedsWatchBudget', () => {
  it('is true only above the cap', () => {
    expect(exceedsWatchBudget(WATCH_DIR_CAP, WATCH_DIR_CAP)).toBe(false)
    expect(exceedsWatchBudget(WATCH_DIR_CAP + 1, WATCH_DIR_CAP)).toBe(true)
  })
})

describe('countDirsBounded', () => {
  // Inject an in-memory tree so the test does no real I/O.
  const tree: Record<string, string[]> = {
    '/p': ['src', 'node_modules', 'a'],
    '/p/src': ['inner'],
    '/p/src/inner': [],
    '/p/a': [],
    // node_modules is huge but must be pruned and never descended into:
    '/p/node_modules': ['x', 'y', 'z']
  }
  // countDirsBounded builds child paths with path.join, which uses '\' on
  // Windows — normalize to '/' so the in-memory tree lookup is OS-independent.
  const read = (p: string): string[] => tree[p.split(/[\\/]/).join('/')] ?? []

  it('counts dirs but prunes IGNORED_ENTRIES (node_modules)', async () => {
    // /p, /p/src, /p/src/inner, /p/a = 4 (node_modules pruned)
    expect(await countDirsBounded('/p', 100, read)).toBe(4)
  })

  it('stops early once the cap is exceeded', async () => {
    const big: Record<string, string[]> = { '/big': Array.from({ length: 50 }, (_, i) => `d${i}`) }
    for (let i = 0; i < 50; i++) big[`/big/d${i}`] = []
    const r = (p: string): string[] => big[p.split(/[\\/]/).join('/')] ?? []
    expect(await countDirsBounded('/big', 10, r)).toBeGreaterThan(10)
  })

  it('bails (reports too big) when the scan exceeds its time budget', async () => {
    // Models a slow (iCloud/network) tree: each readdir "takes" 100ms of the fake
    // clock and always yields more dirs, so the time budget — not the cap — stops it.
    let t = 0
    const now = (): number => t
    const slowRead = (): string[] => {
      t += 100
      return Array.from({ length: 5 }, (_, i) => `d${i}`)
    }
    expect(await countDirsBounded('/root', 100_000, slowRead, 250, now)).toBeGreaterThan(100_000)
  })
})
