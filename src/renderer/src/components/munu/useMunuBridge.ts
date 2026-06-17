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
  const activeId = useWorkspaceStore((s) => s.activeId)

  // Report this window's aggregate whenever its state, active tab, or focus
  // changes — focus/active-tab affect whether each ask is currently visible.
  useEffect(() => {
    const report = (): void => {
      void window.dockterm.invoke(
        'munu:report',
        useMunuStore.getState().snapshot(useWorkspaceStore.getState().activeId, document.hasFocus())
      )
    }
    report()
    window.addEventListener('focus', report)
    window.addEventListener('blur', report)
    return () => {
      window.removeEventListener('focus', report)
      window.removeEventListener('blur', report)
    }
  }, [panes, done, activeId])

  // The overlay answered the asking pane's menu; main synthesized the exact key
  // sequence (arrow nav / checkbox toggles / Enter) — just write it to the pane.
  useEffect(
    () =>
      window.dockterm.on('munu:doAnswer', ({ leafId, keys }) => {
        paneWriters.write(leafId, keys)
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
