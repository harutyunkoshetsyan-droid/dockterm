import { useEffect } from 'react'
import { Activity } from 'lucide-react'
import { useUsageStore } from '../../state/useUsageStore'
import { useAppStore } from '../../state/useAppStore'
import { fmtTokens } from './format'

/** Compact, always-visible readout of the exact tokens used in the last 5 hours.
 * Clicking opens the full Usage panel. Hidden until there's local usage to show. */
export function UsagePill() {
  const snap = useUsageStore((s) => s.snapshot)
  const load = useUsageStore((s) => s.load)
  const enabled = useAppStore((s) => s.settings?.usage.enabled) ?? true
  const openPanel = useAppStore((s) => s.openPanel)
  const toggle = useAppStore((s) => s.togglePanel)

  useEffect(() => {
    if (enabled) void load()
  }, [load, enabled])

  if (!enabled || !snap || snap.empty) return null

  const used = snap.last5h.totalTokens
  const tip =
    `${fmtTokens(used)} tokens used in the last 5 hours` +
    ` — last 7 days: ${fmtTokens(snap.last7d.totalTokens)} tokens`

  return (
    <button
      className={`usage-pill${openPanel === 'usage' ? ' usage-pill--active' : ''}`}
      data-tip={tip}
      aria-label={tip}
      onClick={() => toggle('usage')}
    >
      <Activity size={13} className="usage-pill__icon" />
      <span className="usage-pill__pct">{fmtTokens(used)}</span>
      <span className="usage-pill__sub">5h</span>
    </button>
  )
}
