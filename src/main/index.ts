import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerAppSchemePrivileges, serveAppProtocol } from './protocol'
import { applyGlobalSecurity } from './security'
import { registerIpc } from './ipc/register'
import { killAllPtys } from './services/ptyService'
import { stopWatching } from './services/watcherService'

// Must run before `app` is ready.
registerAppSchemePrivileges()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  void app.whenReady().then(() => {
    applyGlobalSecurity()
    serveAppProtocol()
    registerIpc()
    createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('before-quit', () => {
    killAllPtys()
    stopWatching()
  })

  app.on('window-all-closed', () => {
    killAllPtys()
    stopWatching()
    if (process.platform !== 'darwin') app.quit()
  })
}
