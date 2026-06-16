import { BrowserWindow, Notification, powerSaveBlocker, webContents } from 'electron'
import { aggregate } from '@shared/munu'
import { getSettings } from './settingsService'
import {
  createOverlayWindow,
  destroyOverlay,
  getOverlay,
  setOverlayInteractive as setOverlayClickThrough
} from '../overlayWindow'
import type { MunuAsk, MunuGlobal, MunuState } from '@shared/types'

/** Per-window aggregate, keyed by webContents id. */
const windowStates = new Map<number, MunuGlobal>()
let blockerId: number | null = null
let lastNotified: MunuState = 'idle'

export function reportMunu(wcId: number, payload: MunuGlobal): void {
  windowStates.set(wcId, payload)
  pushGlobal()
}

export function dropWindowMunu(wcId: number): void {
  if (windowStates.delete(wcId)) pushGlobal()
}

function computeGlobal(): MunuGlobal {
  const states: MunuState[] = []
  const asks: MunuAsk[] = []
  for (const g of windowStates.values()) {
    states.push(g.state)
    for (const a of g.asks) asks.push(a)
  }
  return { state: aggregate(states), asks }
}

function pushGlobal(): void {
  const global = computeGlobal()
  const overlay = getOverlay()
  if (overlay) overlay.webContents.send('munu:state', global)
  applyKeepAwake(global.state)
  maybeNotify(global.state)
}

/** The window + first asking pane (used to route answers / focus). */
function ownerOfPrimaryAsk(): { wc: Electron.WebContents; ask: MunuAsk } | null {
  for (const [wcId, g] of windowStates) {
    if (g.state === 'asking' && g.asks[0]) {
      const wc = webContents.fromId(wcId)
      if (wc && !wc.isDestroyed()) return { wc, ask: g.asks[0] }
    }
  }
  return null
}

export function answerMunu(key: 'enter' | 'esc'): void {
  const o = ownerOfPrimaryAsk()
  if (o) o.wc.send('munu:doAnswer', { leafId: o.ask.leafId, key })
}

export function focusMunu(): void {
  const o = ownerOfPrimaryAsk()
  if (!o) return
  const win = BrowserWindow.fromWebContents(o.wc)
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }
  o.wc.send('munu:doFocus', { tabId: o.ask.tabId, leafId: o.ask.leafId })
}

export function setMunuInteractive(interactive: boolean): void {
  setOverlayClickThrough(interactive)
}

function applyKeepAwake(state: MunuState): void {
  const want = getSettings().munu.keepAwake && state === 'working'
  if (want && blockerId === null) {
    blockerId = powerSaveBlocker.start('prevent-app-suspension')
  } else if (!want && blockerId !== null) {
    powerSaveBlocker.stop(blockerId)
    blockerId = null
  }
}

function maybeNotify(state: MunuState): void {
  if (!getSettings().munu.notifications || !Notification.isSupported()) {
    lastNotified = state
    return
  }
  const appFocused = BrowserWindow.getAllWindows().some((w) => w.isFocused())
  if (appFocused) {
    lastNotified = state
    return
  }
  if ((state === 'asking' || state === 'done') && state !== lastNotified) {
    new Notification({
      title: 'DockTerm',
      body: state === 'asking' ? 'Claude needs your approval' : 'Claude finished',
      silent: !getSettings().munu.sounds
    }).show()
  }
  lastNotified = state
}

/** Create or tear down the overlay to match settings. Called at startup, on
 * activate, and whenever settings change. */
export function syncOverlay(): void {
  const m = getSettings().munu
  try {
    if (m.enabled && m.overlay) {
      createOverlayWindow()
      pushGlobal()
    } else {
      destroyOverlay()
    }
  } catch (e) {
    // The floating overlay must never be able to break the app — it's optional.
    console.error('[munu] overlay sync failed:', e)
  }
}
