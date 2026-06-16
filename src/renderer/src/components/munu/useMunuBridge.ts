import { useEffect } from 'react'
import { useMunuStore } from '../../state/useMunuStore'
import { useWorkspaceStore } from '../../state/useWorkspaceStore'
import { paneWriters } from '../../state/paneWriters'

/**
 * Bridges this window's munu state to the main process (which drives the floating
 * overlay + global aggregation) and handles answer/focus requests routed back
 * from the overlay.
 */
export function useMunuBridge(): void {
  const panes = useMunuStore((s) => s.panes)
  const done = useMunuStore((s) => s.done)

  // Report this window's aggregate whenever it changes.
  useEffect(() => {
    void window.dockterm.invoke('munu:report', useMunuStore.getState().snapshot())
  }, [panes, done])

  // The overlay (or a notification) asked to answer Claude in the asking pane.
  useEffect(
    () =>
      window.dockterm.on('munu:doAnswer', ({ leafId, key }) => {
        paneWriters.write(leafId, key === 'enter' ? '\r' : '\x1b')
      }),
    []
  )

  // The overlay asked to jump to the asking pane (window raise handled in main).
  useEffect(
    () =>
      window.dockterm.on('munu:doFocus', ({ tabId, leafId }) => {
        useWorkspaceStore.getState().focusPane(tabId, leafId)
      }),
    []
  )
}
