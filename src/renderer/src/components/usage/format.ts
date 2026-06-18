/** Compact token formatting: 1234 → "1.2k", 4_500_000 → "4.50M". */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

/** Remaining-time label: 130min → "2h 10m", 44min → "44m", past → "now". */
export function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const totalMin = Math.floor(ms / 60_000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

/** Absolute reset time in the user's locale, e.g. "Wed 3:40 PM". */
export function fmtResetClock(epoch: number): string {
  return new Date(epoch).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/** Ring/bar color by how much headroom is left: green → amber → red. */
export function toneColor(percentLeft: number): string {
  if (percentLeft > 50) return 'var(--success)'
  if (percentLeft > 20) return 'var(--warning)'
  return 'var(--danger)'
}
