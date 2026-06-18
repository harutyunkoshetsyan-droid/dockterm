import type { MunuState } from '../../state/munuAggregate'
import type { MascotCharacter } from '@shared/types'
import { artFor } from './mascots'
import './munu.css'

/** The live, animated mascot. `done` shows the happy face; `sleeping` overrides all. */
export function Munu({
  state,
  character = 'munu',
  sleeping: isSleeping = false,
  size = 24
}: {
  state: MunuState
  character?: MascotCharacter
  sleeping?: boolean
  size?: number
}) {
  const kind = isSleeping ? 'sleeping' : state
  const raw = artFor(character, state, isSleeping)
  return (
    <span
      className={`munu munu--${kind}`}
      style={{ width: size, height: size }}
      // Bundled, trusted asset — not user input.
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  )
}
