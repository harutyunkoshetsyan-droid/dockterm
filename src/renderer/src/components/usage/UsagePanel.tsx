import { useEffect } from 'react'
import { Activity, RefreshCw, Clock } from 'lucide-react'
import { useUsageStore } from '../../state/useUsageStore'
import { useAppStore } from '../../state/useAppStore'
import type { UsageBucket } from '@shared/types'
import { useNowTick } from './useNowTick'
import { fmtTokens, fmtCountdown, fmtResetClock } from './format'

/** Headline card for one window: the exact tokens used in it + when it resets. */
function WindowCard({
  title,
  used,
  resetAt,
  now
}: {
  title: string
  used: number
  resetAt: number | null
  now: number
}) {
  return (
    <div className="usage-win">
      <div className="usage-win__amount">
        <span className="usage-win__num">{fmtTokens(used)}</span>
        <span className="usage-win__unit">tokens</span>
      </div>
      <div className="usage-win__meta">
        <div className="usage-win__title">{title}</div>
        {resetAt ? (
          <div className="usage-win__reset">
            <Clock size={12} /> Resets in <b>{fmtCountdown(resetAt - now)}</b>
            <span className="usage-win__at">· {fmtResetClock(resetAt)}</span>
          </div>
        ) : (
          <div className="usage-win__reset usage-win__reset--idle">
            Fresh — resets once you start
          </div>
        )}
      </div>
    </div>
  )
}

/** 30-day token trend (relative, not a running total). */
function Spark({ daily }: { daily: UsageBucket[] }) {
  const vals = daily.map((d) => d.totalTokens)
  const max = Math.max(1, ...vals)
  const W = 240
  const H = 52
  const n = vals.length
  const pts = vals.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W
    const y = H - (v / max) * (H - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg
      className="usage-spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
    >
      <path d={area} className="usage-spark__area" />
      <path d={line} className="usage-spark__line" fill="none" />
    </svg>
  )
}

function Bars({ rows }: { rows: UsageBucket[] }) {
  const max = Math.max(1, ...rows.map((r) => r.totalTokens))
  return (
    <div className="usage-bars">
      {rows.map((r) => (
        <div className="usage-bar" key={r.key} title={r.key}>
          <span className="usage-bar__label">{r.label}</span>
          <span className="usage-bar__track">
            <span className="usage-bar__fill" style={{ width: `${(r.totalTokens / max) * 100}%` }} />
          </span>
          <span className="usage-bar__val">{fmtTokens(r.totalTokens)}</span>
        </div>
      ))}
    </div>
  )
}

export function UsagePanel() {
  const snap = useUsageStore((s) => s.snapshot)
  const load = useUsageStore((s) => s.load)
  const enabled = useAppStore((s) => s.settings?.usage.enabled) ?? true
  const now = useNowTick()
  useEffect(() => {
    if (enabled) void load()
  }, [load, enabled])

  return (
    <div className="panel">
      <div className="panel__head">
        <span className="panel__title">Usage</span>
        <div className="panel__actions">
          <button className="iconbtn iconbtn--sm" title="Refresh" onClick={() => void load()}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      <div className="panel__body">
        {!enabled ? (
          <div className="mcp-empty">
            <Activity size={15} /> Usage is turned off. Turn it back on in{' '}
            <b>Settings → Usage</b>.
          </div>
        ) : !snap || snap.empty ? (
          <div className="mcp-empty">
            <Activity size={15} /> No Claude usage found yet. As you run Claude in a terminal,
            your remaining limits show up here — live. (If you don&apos;t use Claude Code on this
            machine, there&apos;s nothing to show.)
          </div>
        ) : (
          <>
            <WindowCard
              title="Last 5 hours"
              used={snap.last5h.totalTokens}
              resetAt={snap.fiveHour.resetAt}
              now={now}
            />
            <WindowCard
              title="Last 7 days"
              used={snap.last7d.totalTokens}
              resetAt={snap.weekly.resetAt}
              now={now}
            />

            <div className="usage-note">
              Exact token usage read from your local Claude Code sessions on this machine.
            </div>

            <div className="usage-section">
              <div className="usage-section__head">
                <span>Activity · last {snap.daily.length} days</span>
                <span className="usage-live">
                  <span className="usage-live__dot" /> live
                </span>
              </div>
              <Spark daily={snap.daily} />
            </div>

            {snap.byModel.length > 0 && (
              <div className="usage-section">
                <div className="usage-section__head">
                  <span>By model · 30 days</span>
                </div>
                <Bars rows={snap.byModel} />
              </div>
            )}

            {snap.byProject.length > 0 && (
              <div className="usage-section">
                <div className="usage-section__head">
                  <span>By project · 30 days</span>
                </div>
                <Bars rows={snap.byProject} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
