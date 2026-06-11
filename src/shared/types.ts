/** Domain types shared between main and renderer. Extended per milestone. */

export type PanelId = 'files' | 'git' | 'review' | 'mcp' | 'skills' | 'info' | 'settings'

export type AccentName = 'violet' | 'blue' | 'teal'
export type TerminalRenderer = 'auto' | 'dom'
export type CursorStyle = 'block' | 'underline' | 'bar'

export interface TerminalSettings {
  /** null = use the built-in mono stack. */
  fontFamily: string | null
  fontSize: number
  cursorStyle: CursorStyle
  cursorBlink: boolean
  renderer: TerminalRenderer
  scrollback: number
}

export interface EditorSettings {
  fontSize: number
}

export interface UiSettings {
  accent: AccentName
  dockWidth: number
  editorRatio: number
  miniTermHeight: number
  openPanel: PanelId | null
  miniTermOpen: boolean
  editorOpen: boolean
}

export interface GitSettings {
  beginnerMode: boolean
  confirmDanger: boolean
}

export interface ClaudeSettings {
  /** Opt-in (default false): allow reading user-scope ~/.claude config for MCP/skills panels. */
  readUserConfig: boolean
}

export interface Checkpoint {
  hash: string
  branch: string
  label: string
  createdAt: number
}

export interface RecentProject {
  path: string
  name: string
  lastOpenedAt: number
}

export interface Settings {
  schemaVersion: number
  lastProjectPath: string | null
  recentProjects: RecentProject[]
  terminal: TerminalSettings
  editor: EditorSettings
  ui: UiSettings
  git: GitSettings
  claude: ClaudeSettings
  /** Keyed by project path. */
  checkpoints: Record<string, Checkpoint>
}

export interface ProjectInfo {
  path: string
  name: string
  isGitRepo: boolean
}
