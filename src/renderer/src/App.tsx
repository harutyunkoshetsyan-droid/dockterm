import { useEffect } from 'react'
import { useAppStore } from './state/useAppStore'
import { Shell } from './components/layout/Shell'
import { EmptyState } from './components/common/EmptyState'

export default function App() {
  const ready = useAppStore((s) => s.ready)
  const project = useAppStore((s) => s.project)
  const accent = useAppStore((s) => s.settings?.ui.accent)
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (accent) document.documentElement.dataset.accent = accent
  }, [accent])

  if (!ready) return <div className="app app--loading" />
  return project ? <Shell /> : <EmptyState />
}
