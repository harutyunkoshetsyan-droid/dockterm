import { BrowserWindow, dialog } from 'electron'
import { z } from 'zod'
import { ok, err } from '@shared/result'
import { inspectProject, initGitRepo } from '../../services/projectService'
import { addRecentProject, getSettings } from '../../services/settingsService'
import { startWatching } from '../../services/watcherService'
import type { Registrar } from '../register'

const pathSchema = z.object({ path: z.string().min(1).max(4096) })

export function registerProjectHandlers(reg: Registrar): void {
  reg('project:openDialog', z.void(), async (_req, event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) {
      return ok({ canceled: true as const })
    }
    return ok({ path: result.filePaths[0] })
  })

  reg('project:open', pathSchema, async (req, event) => {
    try {
      const info = await inspectProject(req.path)
      addRecentProject({ path: info.path, name: info.name, lastOpenedAt: Date.now() })
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) startWatching(info.path, win)
      return ok(info)
    } catch (e) {
      return err('NOT_FOUND', e instanceof Error ? e.message : 'Cannot open project')
    }
  })

  reg('project:getRecent', z.void(), () => ok(getSettings().recentProjects))

  reg('project:gitInit', pathSchema, async (req) => {
    try {
      return ok(await initGitRepo(req.path))
    } catch (e) {
      return err('GIT', e instanceof Error ? e.message : 'git init failed')
    }
  })
}
