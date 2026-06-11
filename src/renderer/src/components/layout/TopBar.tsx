import { GitBranch, FolderOpen } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'

export function TopBar() {
  const project = useAppStore((s) => s.project)
  const openDialog = useAppStore((s) => s.openProjectDialog)

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="topbar__project"
          onClick={() => void openDialog()}
          title="Open another project"
        >
          <FolderOpen size={13} />
          <span>{project?.name ?? 'DockTerm'}</span>
        </button>
        {project?.branch && (
          <span className="topbar__branch">
            <GitBranch size={12} />
            {project.branch}
          </span>
        )}
      </div>
      <div className="topbar__right" />
    </header>
  )
}
