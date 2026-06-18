import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { IGNORED_ENTRIES } from '@shared/constants'

/**
 * Hard cap on directories we will set up a recursive watch over. chokidar 4 has
 * no fsevents, so on Linux it creates one inotify watch per directory by walking
 * the whole tree — past a few thousand dirs that walk storms the event loop for
 * seconds and starves terminal I/O. Above the cap we simply skip live watching
 * (the file tree still works on demand; there are just no live change events).
 */
export const WATCH_DIR_CAP = 2000

export function exceedsWatchBudget(dirCount: number, cap = WATCH_DIR_CAP): boolean {
  return dirCount > cap
}

type DirReader = (p: string) => string[]

const defaultReader: DirReader = (p) => {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.isSymbolicLink())
      .map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Count directories under `root`, pruning IGNORED_ENTRIES, and STOP as soon as
 * `cap` is exceeded (so a huge tree returns quickly with count > cap). `read` is
 * injectable for tests. Iterative to avoid deep recursion on pathological trees.
 */
export function countDirsBounded(root: string, cap = WATCH_DIR_CAP, read: DirReader = defaultReader): number {
  let count = 0
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop() as string
    count++
    if (count > cap) return count
    for (const name of read(dir)) {
      if (IGNORED_ENTRIES.includes(name)) continue
      stack.push(join(dir, name))
    }
  }
  return count
}
