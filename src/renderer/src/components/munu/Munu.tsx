import type { MunuState } from '../../state/munuAggregate'
// Inline the SVG markup (?raw) so the SVGs' own SMIL animations actually run
// (an <img> would freeze them) and we can layer extra CSS motion on top.
import resting from '../../assets/munu/munu.svg?raw'
import happy from '../../assets/munu/munu-happy.svg?raw'
import working from '../../assets/munu/munu-working.svg?raw'
import sleeping from '../../assets/munu/munu-sleeping.svg?raw'
import asking from '../../assets/munu/munu-asking.svg?raw'
import './munu.css'

const ART: Record<MunuState, string> = { idle: resting, working, asking, done: happy }

/** The live, animated munu. `done` shows the happy face; `sleeping` overrides all. */
export function Munu({
  state,
  sleeping: isSleeping = false,
  size = 24
}: {
  state: MunuState
  sleeping?: boolean
  size?: number
}) {
  const kind = isSleeping ? 'sleeping' : state
  const raw = isSleeping ? sleeping : ART[state]
  return (
    <span
      className={`munu munu--${kind}`}
      style={{ width: size, height: size }}
      // Bundled, trusted asset — not user input.
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  )
}
