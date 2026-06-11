import { watch, type FSWatcher } from 'chokidar'
import { relative, sep } from 'node:path'
import type { BrowserWindow } from 'electron'
import { IGNORED_ENTRIES, WATCH_DEBOUNCE_MS, SESSION_CHANGE_LOG_CAP } from '@shared/constants'
import type { WatchEvent } from '@shared/ipc'

let watcher: FSWatcher | null = null
let root: string | null = null
let batch: WatchEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

/** Files changed since the watcher started, capped — backs the "changed since
 * app opened" review baseline. */
const sessionLog = new Set<string>()

export function startWatching(projectRoot: string, win: BrowserWindow): void {
  stopWatching()
  root = projectRoot
  watcher = watch(projectRoot, {
    ignoreInitial: true,
    followSymlinks: false,
    depth: 99,
    ignored: (p: string) => {
      const segments = p.split(/[\\/]/)
      return IGNORED_ENTRIES.some((entry) => segments.includes(entry))
    }
  })

  const handler = (type: WatchEvent['type']) => (path: string): void => {
    if (!root) return
    const relPath = relative(root, path).split(sep).join('/')
    if (!relPath) return
    batch.push({ type, relPath })
    if (type === 'add' || type === 'change' || type === 'unlink') {
      sessionLog.add(relPath)
      if (sessionLog.size > SESSION_CHANGE_LOG_CAP) {
        sessionLog.delete(sessionLog.values().next().value as string)
      }
    }
    schedule(win)
  }

  watcher
    .on('add', handler('add'))
    .on('change', handler('change'))
    .on('unlink', handler('unlink'))
    .on('addDir', handler('addDir'))
    .on('unlinkDir', handler('unlinkDir'))
}

function schedule(win: BrowserWindow): void {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    if (batch.length === 0) return
    const events = batch
    batch = []
    if (!win.isDestroyed()) win.webContents.send('fs:watch', { events })
  }, WATCH_DEBOUNCE_MS)
}

export function getSessionChanges(): string[] {
  return [...sessionLog]
}

export function stopWatching(): void {
  if (watcher) {
    void watcher.close()
    watcher = null
  }
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  batch = []
  root = null
  sessionLog.clear()
}
