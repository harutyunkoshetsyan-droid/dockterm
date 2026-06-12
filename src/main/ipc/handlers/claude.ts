import { z } from 'zod'
import { ok, err } from '@shared/result'
import { readMcp, createMcpTemplate } from '../../services/claudeConfigService'
import { readSkills, createSkill } from '../../services/skillsService'
import { getSettings } from '../../services/settingsService'
import type { Registrar } from '../register'

const templateEnum = z.enum(['brainstorming', 'ultraplan', 'review-changes', 'safe-commit', 'blank'])

export function registerClaudeHandlers(reg: Registrar): void {
  reg('claude:mcpRead', z.object({ includeUser: z.boolean() }), (req) => {
    // Double gate: the panel asks, and the user must have opted in via settings.
    const allowUser = req.includeUser && getSettings().claude.readUserConfig
    try {
      return ok(readMcp(allowUser))
    } catch (e) {
      return err('IO', e instanceof Error ? e.message : 'Could not read MCP config')
    }
  })

  reg('claude:mcpCreateTemplate', z.void(), () => {
    try {
      return ok({ relPath: createMcpTemplate() })
    } catch (e) {
      const exists =
        (e as NodeJS.ErrnoException).code === 'EEXIST' ||
        (e instanceof Error && e.message.includes('exists'))
      return err(exists ? 'EXISTS' : 'IO', e instanceof Error ? e.message : 'Could not create template')
    }
  })

  reg('claude:skillsRead', z.object({ includeUser: z.boolean() }), (req) => {
    const allowUser = req.includeUser && getSettings().claude.readUserConfig
    try {
      return ok(readSkills(allowUser))
    } catch (e) {
      return err('IO', e instanceof Error ? e.message : 'Could not read skills')
    }
  })

  reg(
    'claude:skillCreate',
    z.object({
      name: z.string().min(1).max(100),
      kind: z.enum(['skill', 'command']),
      template: templateEnum
    }),
    (req) => {
      try {
        return ok({ relPath: createSkill(req.name, req.kind, req.template) })
      } catch (e) {
        const exists = e instanceof Error && e.message.includes('exists')
        return err(exists ? 'EXISTS' : 'IO', e instanceof Error ? e.message : 'Could not create')
      }
    }
  )
}
