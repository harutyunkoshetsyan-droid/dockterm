import { readdir } from 'node:fs/promises'
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

/**
 * Wall-clock budget for the directory scan itself. A single `readdir` on an
 * iCloud-synced / network folder (e.g. macOS ~/Desktop or ~/Documents) can block
 * for *seconds*; rather than keep walking, we bail and treat the tree as "too
 * big to watch". Keeps `cd`-ing into such a folder instant.
 */
export const WATCH_BUDGET_MS = 400

export function exceedsWatchBudget(dirCount: number, cap = WATCH_DIR_CAP): boolean {
  return dirCount > cap
}

type DirReader = (p: string) => Promise<string[]> | string[]

const defaultReader: DirReader = async (p) => {
  try {
    return (await readdir(p, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.isSymbolicLink())
      .map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Count directories under `root`, pruning IGNORED_ENTRIES, and STOP as soon as
 * `cap` is exceeded OR `budgetMs` of wall-clock elapses (returning a count above
 * `cap` to signal "too big"). Async + yielding so a slow tree never blocks the
 * main process — the freeze this used to cause on iCloud/network folders is gone.
 * `read` / `now` are injectable for tests.
 */
export async function countDirsBounded(
  root: string,
  cap = WATCH_DIR_CAP,
  read: DirReader = defaultReader,
  budgetMs = WATCH_BUDGET_MS,
  now: () => number = Date.now
): Promise<number> {
  const start = now()
  let count = 0
  const stack = [root]
  while (stack.length > 0) {
    if (now() - start > budgetMs) return cap + 1 // scan took too long → treat as too big
    const dir = stack.pop() as string
    count++
    if (count > cap) return count
    for (const name of await read(dir)) {
      if (IGNORED_ENTRIES.includes(name)) continue
      stack.push(join(dir, name))
    }
  }
  return count
}
