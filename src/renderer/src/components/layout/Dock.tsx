import { useAppStore } from '../../state/useAppStore'
import { FileTree } from '../files/FileTree'
import { GitPanel } from '../git/GitPanel'
import { ReviewPanel } from '../review/ReviewPanel'
import { McpPanel } from '../mcp/McpPanel'
import { SkillsPanel } from '../skills/SkillsPanel'

export function Dock() {
  const openPanel = useAppStore((s) => s.openPanel)
  if (!openPanel) return null

  return (
    <aside className="dock">
      {openPanel === 'files' && <FileTree />}
      {openPanel === 'git' && <GitPanel />}
      {openPanel === 'review' && <ReviewPanel />}
      {openPanel === 'mcp' && <McpPanel />}
      {openPanel === 'skills' && <SkillsPanel />}
    </aside>
  )
}
