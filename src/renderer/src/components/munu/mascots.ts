import type { MunuState } from '../../state/munuAggregate'
import type { MascotCharacter } from '@shared/types'

// munu
import muIdle from '../../assets/munu/munu.svg?raw'
import muHappy from '../../assets/munu/munu-happy.svg?raw'
import muWork from '../../assets/munu/munu-working.svg?raw'
import muSleep from '../../assets/munu/munu-sleeping.svg?raw'
import muAsk from '../../assets/munu/munu-asking.svg?raw'
// nvurd
import nvIdle from '../../assets/nvurd/nvurd.svg?raw'
import nvHappy from '../../assets/nvurd/nvurd-happy.svg?raw'
import nvWork from '../../assets/nvurd/nvurd-working.svg?raw'
import nvSleep from '../../assets/nvurd/nvurd-sleeping.svg?raw'
import nvAsk from '../../assets/nvurd/nvurd-asking.svg?raw'
// guru
import guIdle from '../../assets/guru/guru.svg?raw'
import guHappy from '../../assets/guru/guru-happy.svg?raw'
import guWork from '../../assets/guru/guru-working.svg?raw'
import guSleep from '../../assets/guru/guru-sleeping.svg?raw'
import guAsk from '../../assets/guru/guru-asking.svg?raw'
// adanana
import adIdle from '../../assets/adanana/adanana.svg?raw'
import adHappy from '../../assets/adanana/adanana-happy.svg?raw'
import adWork from '../../assets/adanana/adanana-working.svg?raw'
import adSleep from '../../assets/adanana/adanana-sleeping.svg?raw'
import adAsk from '../../assets/adanana/adanana-asking.svg?raw'

/** One character's art, keyed by the four live states + the sleeping override. */
type ArtSet = Record<MunuState, string> & { sleeping: string }

const SETS: Record<MascotCharacter, ArtSet> = {
  munu: { idle: muIdle, working: muWork, asking: muAsk, done: muHappy, sleeping: muSleep },
  nvurd: { idle: nvIdle, working: nvWork, asking: nvAsk, done: nvHappy, sleeping: nvSleep },
  guru: { idle: guIdle, working: guWork, asking: guAsk, done: guHappy, sleeping: guSleep },
  adanana: { idle: adIdle, working: adWork, asking: adAsk, done: adHappy, sleeping: adSleep }
}

/** Picker metadata. munu is first so it reads as the default. */
export const CHARACTERS: { id: MascotCharacter; label: string; blurb: string }[] = [
  { id: 'munu', label: 'munu', blurb: 'the original · calm violet' },
  { id: 'nvurd', label: 'nvurd', blurb: 'cheerful · bow · rose' },
  { id: 'guru', label: 'guru', blurb: 'wise · glasses · green' },
  { id: 'adanana', label: 'adanana', blurb: 'sunny · banana · amber' }
]

/** Resolve the raw SVG for a character + state. `sleeping` overrides everything. */
export function artFor(character: MascotCharacter, state: MunuState, sleeping: boolean): string {
  const set = SETS[character] ?? SETS.munu
  return sleeping ? set.sleeping : set[state]
}
