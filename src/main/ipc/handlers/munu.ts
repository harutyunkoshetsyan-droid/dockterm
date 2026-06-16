import { z } from 'zod'
import { ok } from '@shared/result'
import { reportMunu, answerMunu, focusMunu, setMunuInteractive } from '../../services/munuService'
import type { Registrar } from '../register'

const askSchema = z.object({
  leafId: z.string(),
  tabId: z.string(),
  title: z.string().nullable(),
  options: z.array(z.string()).max(16),
  binary: z.boolean()
})
const reportSchema = z.object({
  state: z.enum(['idle', 'working', 'asking', 'done']),
  asks: z.array(askSchema).max(64)
})
const answerSchema = z.object({ key: z.enum(['enter', 'esc']) })
const interactiveSchema = z.object({ interactive: z.boolean() })

export function registerMunuHandlers(reg: Registrar): void {
  reg('munu:report', reportSchema, (req, event) => {
    reportMunu(event.sender.id, req)
    return ok(undefined)
  })

  reg('munu:answer', answerSchema, (req) => {
    answerMunu(req.key)
    return ok(undefined)
  })

  reg('munu:focus', z.void(), () => {
    focusMunu()
    return ok(undefined)
  })

  reg('munu:setInteractive', interactiveSchema, (req) => {
    setMunuInteractive(req.interactive)
    return ok(undefined)
  })
}
