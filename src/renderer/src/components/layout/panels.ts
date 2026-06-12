import type { LucideIcon } from 'lucide-react'
import { FolderTree, GitBranch, GitCompare } from 'lucide-react'
import type { PanelId } from '@shared/types'

export interface PanelDef {
  id: PanelId
  label: string
  icon: LucideIcon
}

/** Dock panels, added here as each is implemented (no buttons for unbuilt panels). */
export const PANELS: PanelDef[] = [
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'git', label: 'Source Control', icon: GitBranch },
  { id: 'review', label: 'Review', icon: GitCompare }
]
