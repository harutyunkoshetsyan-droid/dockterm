// Tiny synthesized cues (no audio assets). Soft sine blips so they're pleasant,
// not jarring. Created lazily so we don't open an AudioContext until needed.
let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function blip(freq: number, at: number, dur: number, gain = 0.05): void {
  const c = ac()
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Attention cue when Claude needs you — a gentle, friendly knock-knock. */
export function playAsk(): void {
  blip(587, 0, 0.13, 0.05) // D5
  blip(784, 0.13, 0.2, 0.05) // G5
}

/** Completion cue — a cute little ascending sparkle ("ta-daa ✨"). */
export function playDone(): void {
  blip(523, 0, 0.12, 0.05) // C5
  blip(659, 0.1, 0.12, 0.05) // E5
  blip(784, 0.2, 0.14, 0.05) // G5
  blip(1047, 0.32, 0.3, 0.045) // C6
  blip(1568, 0.42, 0.32, 0.03) // G6 sparkle
}
