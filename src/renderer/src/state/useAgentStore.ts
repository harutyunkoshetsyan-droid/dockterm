import { create } from 'zustand'
import type { AgentActivity } from '@shared/types'

interface AgentStore {
  activity: AgentActivity | null
  load: () => Promise<void>
}

/**
 * Live Claude Code sub-agent activity, pushed from main as the local transcripts
 * grow (and fetched once on mount). Read-only; drives the count pill, the Activity
 * panel, and the overlay swarm.
 */
export const useAgentStore = create<AgentStore>((set) => {
  if (typeof window !== 'undefined' && window.dockterm) {
    window.dockterm.on('activity:changed', (a) => set({ activity: a }))
  }
  return {
    activity: null,
    load: async () => {
      const r = await window.dockterm.invoke('activity:get', undefined)
      if (r.ok) set({ activity: r.value })
    }
  }
})
