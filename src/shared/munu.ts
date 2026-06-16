import type { MunuState } from './types'

const PRIORITY: MunuState[] = ['done', 'asking', 'working', 'idle']

/** Combine many panes'/windows' states into one, by attention priority. */
export function aggregate(states: MunuState[]): MunuState {
  for (const p of PRIORITY) if (states.includes(p)) return p
  return 'idle'
}
