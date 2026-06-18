import type { ReactNode } from 'react'

/** A circular progress ring. `pct` (0–100) is the filled portion; here it
 * represents the headroom LEFT, so a full ring = plenty left. */
export function Ring({
  pct,
  size = 116,
  stroke = 11,
  color = 'var(--accent)',
  children
}: {
  pct: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const off = c * (1 - clamped / 100)
  const mid = size / 2
  return (
    <div className="usage-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="usage-ring__track"
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${mid} ${mid})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {children !== undefined && <div className="usage-ring__center">{children}</div>}
    </div>
  )
}
