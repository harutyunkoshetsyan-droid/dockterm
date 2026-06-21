import type { AgentPhase, MascotCharacter } from '@shared/types'

/** The four mascot characters, reused as the swarm creatures. */
const CREATURES: MascotCharacter[] = ['munu', 'nvurd', 'guru', 'adanana']

/** Stable string hash (djb2) → deterministic creature per agent type. */
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

/** Pick a mascot character for an agent type — same type always gets the same one. */
export function creatureFor(type: string): MascotCharacter {
  return CREATURES[hash(type) % CREATURES.length]
}

/** Human-readable agent type: 'general-purpose' → 'General Purpose'. */
export function friendlyType(type: string): string {
  const t = type.trim()
  if (!t) return 'Agent'
  return t
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** A compact running/elapsed time: '5s', '1m 35s', '1h 02m'. */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  if (m < 60) return `${m}m ${String(total % 60).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/** CSS modifier suffix for an agent phase (drives status color). */
export function phaseClass(phase: AgentPhase): string {
  return phase
}
