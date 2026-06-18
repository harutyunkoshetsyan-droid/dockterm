// src/renderer/overlay/MunuPopup.tsx
import type { MascotCharacter } from '@shared/types'
import { Munu } from '@renderer/components/munu/Munu'
import { CHARACTERS } from '@renderer/components/munu/mascots'

const SIZE_MIN = 36
const SIZE_MAX = 120
const SIZE_STEP = 8

export function MunuPopup({
  size,
  character,
  pinned,
  onSize,
  onCharacter,
  onPin,
  onOpenApp
}: {
  size: number
  character: MascotCharacter
  pinned: boolean
  onSize: (next: number) => void
  onCharacter: (c: MascotCharacter) => void
  onPin: (next: boolean) => void
  onOpenApp: () => void
}) {
  const clamp = (n: number): number => Math.min(SIZE_MAX, Math.max(SIZE_MIN, n))
  return (
    <div className="mpop" onClick={(e) => e.stopPropagation()}>
      <div className="mpop__row">
        <span className="mpop__label">Size</span>
        <div className="mpop__stepper">
          <button
            className="mpop__btn"
            disabled={size <= SIZE_MIN}
            onClick={() => onSize(clamp(size - SIZE_STEP))}
            title="Smaller"
          >
            −
          </button>
          <span className="mpop__val">{size}</span>
          <button
            className="mpop__btn"
            disabled={size >= SIZE_MAX}
            onClick={() => onSize(clamp(size + SIZE_STEP))}
            title="Bigger"
          >
            +
          </button>
        </div>
      </div>

      <div className="mpop__label mpop__label--block">Character</div>
      <div className="mpop__chars">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`mpop__char${character === c.id ? ' is-active' : ''}`}
            onClick={() => onCharacter(c.id)}
            title={c.blurb}
            aria-pressed={character === c.id}
          >
            <Munu state="idle" character={c.id} size={34} />
          </button>
        ))}
      </div>

      <div className="mpop__row">
        <span className="mpop__label">
          Pin to screen
          <span className="mpop__hint">always visible · drag anywhere</span>
        </span>
        <button
          className={`mpop__toggle${pinned ? ' is-on' : ''}`}
          role="switch"
          aria-checked={pinned}
          onClick={() => onPin(!pinned)}
        >
          <span className="mpop__knob" />
        </button>
      </div>

      <button className="mpop__open" onClick={onOpenApp}>
        Open DockTerm
      </button>
    </div>
  )
}
