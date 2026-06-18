import { app, Tray, Menu, BrowserWindow, globalShortcut, nativeImage } from 'electron'
import { join } from 'node:path'
import { createWindow } from '../window'
import { getOverlay } from '../overlayWindow'

let tray: Tray | null = null

/** Global hotkey to summon/hide DockTerm from anywhere. */
const HOTKEY = 'CommandOrControl+Shift+Backquote'

function toggleVisibility(): void {
  // The munu overlay manages its own visibility (always-on-top + CSS reveal, and
  // stays put when pinned). Exclude it: it must never be hidden by the app toggle,
  // and counting it — it's always "visible" — would otherwise skew the check below
  // so the first toggle hides munu instead of summoning the real windows.
  const ov = getOverlay()
  const wins = BrowserWindow.getAllWindows().filter((w) => w !== ov)
  if (wins.length === 0) {
    createWindow()
    return
  }
  const anyVisible = wins.some((w) => w.isVisible() && !w.isMinimized())
  if (anyVisible) {
    wins.forEach((w) => w.hide())
  } else {
    wins.forEach((w) => {
      w.show()
      w.focus()
    })
  }
}

/** Adds a menu-bar/tray icon and a global show/hide hotkey. Both are best-effort:
 * a missing icon or an already-taken hotkey degrades gracefully. */
export function setupMenubar(): void {
  try {
    const image = nativeImage
      .createFromPath(join(app.getAppPath(), 'build', 'icon.png'))
      .resize({ width: 18, height: 18 })
    if (!image.isEmpty()) {
      tray = new Tray(image)
      tray.setToolTip('DockTerm')
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: 'Show / Hide DockTerm', click: toggleVisibility },
          { label: 'New Window', click: () => createWindow() },
          { type: 'separator' },
          { label: 'Quit DockTerm', role: 'quit' }
        ])
      )
      tray.on('click', toggleVisibility)
    }
  } catch {
    tray = null
  }

  try {
    globalShortcut.register(HOTKEY, toggleVisibility)
  } catch {
    // Hotkey already claimed by another app — skip silently.
  }
}

export function teardownMenubar(): void {
  globalShortcut.unregisterAll()
  tray?.destroy()
  tray = null
}
