import type { CSSProperties } from 'react'
import { Munu } from '@renderer/components/munu/Munu'
import { creatureFor } from '@renderer/components/agents/agentVisual'
import type { LiveAgent } from '@shared/types'

const MAX = 6

/**
 * A little swarm of creatures that gathers under the floating munu while Claude
 * Code sub-agents are running — one mascot per running agent, each working away.
 * Tasteful: capped, staggered entrance, gentle bob, transform/opacity only.
 */
export function Swarm({ agents, size }: { agents: LiveAgent[]; size: number }) {
  const running = agents.filter((a) => a.phase === 'running')
  if (running.length === 0) return null
  const shown = running.slice(0, MAX)
  const extra = running.length - shown.length
  const cs = Math.max(16, Math.round(size * 0.4))

  return (
    <div className="swarm" aria-hidden>
      {shown.map((a, i) => (
        <span className="swarm__bug" key={a.id} style={{ '--i': i } as CSSProperties}>
          <Munu state="working" character={creatureFor(a.type)} size={cs} />
        </span>
      ))}
      {extra > 0 && <span className="swarm__more">+{extra}</span>}
    </div>
  )
}
