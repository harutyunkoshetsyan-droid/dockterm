import { GitBranchPlus } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'
import { TopBar } from './TopBar'
import { TerminalView } from '../terminal/TerminalView'

export function Shell() {
  const project = useAppStore((s) => s.project)
  const settings = useAppStore((s) => s.settings)
  const initGit = useAppStore((s) => s.initGitRepo)

  if (!project) return null
  const t = settings?.terminal

  return (
    <div className="app">
      <TopBar />
      {!project.isGitRepo && (
        <div className="banner">
          <span>This folder isn&apos;t a Git repository yet.</span>
          <button className="btn btn--ghost btn--sm" onClick={() => void initGit()}>
            <GitBranchPlus size={13} /> Initialize Git
          </button>
        </div>
      )}
      <div className="app__body">
        <TerminalView
          key={project.path}
          kind="main"
          cwd={project.path}
          fontFamily={t?.fontFamily ?? undefined}
          fontSize={t?.fontSize}
          cursorStyle={t?.cursorStyle}
          cursorBlink={t?.cursorBlink}
          scrollback={t?.scrollback}
          renderer={t?.renderer}
        />
      </div>
    </div>
  )
}
