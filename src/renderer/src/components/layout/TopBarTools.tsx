import { SquareTerminal } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'
import { UsagePill } from '../usage/UsagePill'
import { NotesButton } from './NotesButton'
import { PANELS } from './panels'

/**
 * The top bar's right-hand tools (usage pill, dock-panel icons, notes, mini
 * terminal). Rendered in the top bar normally, but relocated into the tab-strip
 * row on narrow windows so the controls flow onto that row instead of clipping.
 */
export function TopBarTools() {
  const openPanel = useAppStore((s) => s.openPanel)
  const togglePanel = useAppStore((s) => s.togglePanel)
  const miniTermOpen = useAppStore((s) => s.miniTermOpen)
  const toggleMini = useAppStore((s) => s.toggleMiniTerm)
  const usageEnabled = useAppStore((s) => s.settings?.usage.enabled) ?? true

  // Hide the Usage dock icon when the user has turned Usage off.
  const panels = PANELS.filter((p) => p.id !== 'usage' || usageEnabled)

  return (
    <>
      <UsagePill />
      {panels.map((panel) => {
        const Icon = panel.icon
        return (
          <button
            key={panel.id}
            className={`iconbtn tip--end${openPanel === panel.id ? ' iconbtn--active' : ''}`}
            data-tip={panel.label}
            aria-label={panel.label}
            onClick={() => togglePanel(panel.id)}
          >
            <Icon size={15} />
          </button>
        )
      })}
      <span className="topbar__divider" />
      <NotesButton />
      <button
        className={`iconbtn tip--end${miniTermOpen ? ' iconbtn--active' : ''}`}
        data-tip="Mini terminal"
        aria-label="Mini terminal"
        onClick={toggleMini}
      >
        <SquareTerminal size={15} />
      </button>
    </>
  )
}
