import { BrowserWindow } from 'electron'
import { z } from 'zod'
import { ok } from '@shared/result'
import type { Settings } from '@shared/types'
import { getSettings, applySettingsPatch, settingsPatchSchema } from '../../services/settingsService'
import { syncOverlay } from '../../services/munuService'
import type { Registrar } from '../register'

function broadcast(settings: Settings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('settings:changed', settings)
  }
}

export function registerSettingsHandlers(reg: Registrar): void {
  reg('settings:get', z.void(), () => ok(getSettings()))

  reg('settings:set', settingsPatchSchema, (patch) => {
    // zod has filled every default, so each present section is a complete object.
    const next = applySettingsPatch(patch as Partial<Settings>)
    broadcast(next)
    if (patch.munu) syncOverlay()
    return ok(next)
  })
}
