import { watch, type FSWatcher } from 'chokidar'
import os from 'node:os'
import { relative, resolve, sep } from 'node:path'
import type { BrowserWindow } from 'electron'
import { IGNORED_ENTRIES, WATCH_DEBOUNCE_MS, SESSION_CHANGE_LOG_CAP } from '@shared/constants'
import type { WatchEvent } from '@shared/ipc'

/**
 * Recursively watching an enormous tree (the home directory, a filesystem root)
 * makes chokidar walk millions of paths and freezes the main process. Projects
 * never live at those roots, so we simply don't watch them — the file tree still
 * works on demand; there are just no live change events.
 */
function isTooLargeToWatch(root: string): boolean {
  const r = resolve(root)
  const home = resolve(os.homedir())
  if (r === home) return true
  if (resolve(r, '..') === r) return true // filesystem root (/ or C:\)
  if (home === r || home.startsWith(r + sep)) return true // an ancestor of home (e.g. /Users)
  return false
}

/** One chokidar watcher per window, targeting that window's focused project. */
interface WindowWatch {
  watcher: FSWatcher
  root: string
  batch: WatchEvent[]
  timer: ReturnType<typeof setTimeout> | null
  /** Files changed since the watcher started — backs the review "session" baseline. */
  sessionLog: Set<string>
  win: BrowserWindow
}

const watches = new Map<number, WindowWatch>()

function schedule(id: number): void {
  const w = watches.get(id)
  if (!w || w.timer) return
  w.timer = setTimeout(() => {
    w.timer = null
    if (w.batch.length === 0) return
    const events = w.batch
    w.batch = []
    if (!w.win.isDestroyed()) w.win.webContents.send('fs:watch', { events })
  }, WATCH_DEBOUNCE_MS)
}

function closeWatch(id: number): void {
  const w = watches.get(id)
  if (!w) return
  void w.watcher.close()
  if (w.timer) clearTimeout(w.timer)
  watches.delete(id)
}

/** Point a window's watcher at `projectRoot` (replacing any existing one). */
export function retargetWatcher(win: BrowserWindow, projectRoot: string): void {
  const id = win.webContents.id
  const existing = watches.get(id)
  if (existing && existing.root === projectRoot) return
  closeWatch(id)

  // Never recursively watch the home dir / a filesystem root — it would walk
  // millions of paths and hang the app. (The file tree still works; no live
  // change events for such folders.)
  if (isTooLargeToWatch(projectRoot)) return

  const watcher = watch(projectRoot, {
    ignoreInitial: true,
    followSymlinks: false,
    depth: 16,
    ignored: (p: string) => {
      const segments = p.split(/[\\/]/)
      return IGNORED_ENTRIES.some((entry) => segments.includes(entry))
    }
  })
  const w: WindowWatch = { watcher, root: projectRoot, batch: [], timer: null, sessionLog: new Set(), win }
  watches.set(id, w)

  const handler =
    (type: WatchEvent['type']) =>
    (path: string): void => {
      const relPath = relative(w.root, path).split(sep).join('/')
      if (!relPath) return
      w.batch.push({ type, relPath })
      if (type === 'add' || type === 'change' || type === 'unlink') {
        w.sessionLog.add(relPath)
        if (w.sessionLog.size > SESSION_CHANGE_LOG_CAP) {
          w.sessionLog.delete(w.sessionLog.values().next().value as string)
        }
      }
      schedule(id)
    }

  watcher
    .on('add', handler('add'))
    .on('change', handler('change'))
    .on('unlink', handler('unlink'))
    .on('addDir', handler('addDir'))
    .on('unlinkDir', handler('unlinkDir'))
}

export function getSessionChanges(webContentsId: number): string[] {
  return [...(watches.get(webContentsId)?.sessionLog ?? [])]
}

export function stopWatchingById(webContentsId: number): void {
  closeWatch(webContentsId)
}

export function stopAllWatchers(): void {
  for (const id of [...watches.keys()]) closeWatch(id)
}
