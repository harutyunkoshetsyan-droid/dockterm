/**
 * Registry of per-pane "write to the shell" functions, keyed by leaf id. Lets the
 * munu permission HUD answer Claude in the correct pane (route a keystroke), even
 * when the click came from the separate overlay window (via main → this window).
 */
const writers = new Map<string, (text: string) => void>()

export const paneWriters = {
  register(leafId: string, write: (text: string) => void): void {
    writers.set(leafId, write)
  },
  unregister(leafId: string): void {
    writers.delete(leafId)
  },
  write(leafId: string, text: string): boolean {
    const fn = writers.get(leafId)
    if (!fn) return false
    fn(text)
    return true
  }
}
