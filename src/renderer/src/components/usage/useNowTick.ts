import { useEffect, useState } from 'react'

/** Re-render on a timer so countdowns ("resets in 2h 10m") stay live between
 * pushed usage snapshots. Returns the current epoch ms. */
export function useNowTick(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
