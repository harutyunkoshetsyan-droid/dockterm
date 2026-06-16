import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { applyWindowSecurity } from './security'
import { APP_URL } from './protocol'

export function createMainWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 320,
    show: false,
    // Transparent on macOS so the window vibrancy shows through translucent chrome.
    backgroundColor: isMac ? '#00000000' : '#0d0d0f',
    title: 'DockTerm',
    autoHideMenuBar: true,
    // macOS: hide the OS title bar (content runs to the top edge) but keep the
    // inset traffic-light buttons, and add native frosted-glass vibrancy.
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 14, y: 13 },
          vibrancy: 'under-window' as const,
          visualEffectState: 'active' as const
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false
    }
  })

  applyWindowSecurity(win)
  win.once('ready-to-show', () => win.show())

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadURL(APP_URL)
  }

  return win
}
