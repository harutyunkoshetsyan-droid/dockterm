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

/** Attention cue when Claude needs you — a gentle rising two-note. */
export function playAsk(): void {
  blip(660, 0, 0.16)
  blip(880, 0.14, 0.22)
}

/** Completion cue — a soft three-note chime. */
export function playDone(): void {
  blip(523, 0, 0.14)
  blip(659, 0.12, 0.14)
  blip(784, 0.24, 0.26)
}
