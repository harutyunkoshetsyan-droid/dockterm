import { useMunuStore } from '../../state/useMunuStore'
import { useAppStore } from '../../state/useAppStore'
import { useWorkspaceStore } from '../../state/useWorkspaceStore'
import { MunuFace } from './MunuFace'

const LABEL: Record<string, string> = {
  idle: 'resting',
  working: 'working…',
  asking: 'needs you',
  done: 'done'
}

export function TopBarMunu() {
  const state = useMunuStore((s) => s.munuState())
  const panes = useMunuStore((s) => s.panes)
  const enabled = useAppStore((s) => s.settings?.munu.enabled ?? true)
  const attention = useAppStore((s) => s.settings?.munu.attention ?? true)
  const hasProject = useAppStore((s) => !!s.project)

  if (!enabled) return null

  const label = !hasProject ? 'sleeping' : LABEL[state]
  const cls = `topbar-munu topbar-munu--${state}${attention ? '' : ' topbar-munu--still'}`

  const jumpToAsking = (): void => {
    const entry = Object.entries(panes).find(([, p]) => p.state === 'asking')
    if (entry) useWorkspaceStore.getState().focusPane(entry[1].tabId, entry[0])
  }

  return (
    <button className={cls} title={`munu · ${label}`} onClick={jumpToAsking}>
      <MunuFace state={state} hasProject={hasProject} size={22} />
    </button>
  )
}
