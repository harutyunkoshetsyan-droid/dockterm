import { z } from 'zod'
import { ok, err } from '@shared/result'
import { getProjectInfo } from '../../services/projectInfoService'
import { rootFor } from '../../services/activeRoot'
import type { Registrar } from '../register'

export function registerInfoHandlers(reg: Registrar): void {
  reg('info:get', z.void(), async (_req, event) => {
    try {
      return ok(await getProjectInfo(rootFor(event)))
    } catch (e) {
      return err('IO', e instanceof Error ? e.message : 'Could not read project info')
    }
  })
}
