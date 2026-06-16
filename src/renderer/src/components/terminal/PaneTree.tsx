import { Fragment, type MouseEvent } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { SplitSquareHorizontal, SplitSquareVertical, X } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'
import { useWorkspaceStore } from '../../state/useWorkspaceStore'
import type { LayoutNode, LeafNode } from '../../state/layout'
import { TerminalView } from './TerminalView'

function sameSizes(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.5)
}

function TerminalPane({
  leaf,
  tabId,
  focused,
  canClose
}: {
  leaf: LeafNode
  tabId: string
  focused: boolean
  canClose: boolean
}) {
  const t = useAppStore((s) => s.settings?.terminal)
  const focusPane = useWorkspaceStore((s) => s.focusPane)
  const split = useWorkspaceStore((s) => s.splitFocused)
  const closeFocused = useWorkspaceStore((s) => s.closeFocused)
  const markActivity = useWorkspaceStore((s) => s.markActivity)

  const act = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    focusPane(tabId, leaf.id)
    fn()
  }

  return (
    <div
      className={`pane${focused ? ' pane--focused' : ''}`}
      onMouseDown={() => focusPane(tabId, leaf.id)}
    >
      <div className="pane__bar">
        <span className="pane__title">{leaf.title}</span>
        <div className="pane__actions">
          <button title="Split right" onMouseDown={act(() => split('row'))}>
            <SplitSquareHorizontal size={12} />
          </button>
          <button title="Split down" onMouseDown={act(() => split('col'))}>
            <SplitSquareVertical size={12} />
          </button>
          {canClose && (
            <button title="Close pane" onMouseDown={act(() => closeFocused())}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="pane__term">
        <TerminalView
          kind="main"
          cwd={leaf.cwd}
          active={focused}
          onActivity={() => markActivity(tabId)}
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

export function PaneTree({
  node,
  tabId,
  focusedLeafId,
  tabActive,
  canClose
}: {
  node: LayoutNode
  tabId: string
  focusedLeafId: string
  tabActive: boolean
  canClose: boolean
}) {
  if (node.type === 'leaf') {
    return (
      <TerminalPane
        leaf={node}
        tabId={tabId}
        focused={tabActive && node.id === focusedLeafId}
        canClose={canClose}
      />
    )
  }
  return (
    <Group
      id={node.id}
      orientation={node.dir === 'row' ? 'horizontal' : 'vertical'}
      className="pane-group"
      onLayoutChanged={(layout) => {
        const sizes = node.children.map((c) => layout[c.id] ?? 100 / node.children.length)
        if (!sameSizes(sizes, node.sizes)) useWorkspaceStore.getState().resizeSplit(node.id, sizes)
      }}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <Separator className={`pane-resize pane-resize--${node.dir}`} />}
          <Panel id={child.id} defaultSize={node.sizes[i]} minSize={8} className="pane-panel">
            <PaneTree
              node={child}
              tabId={tabId}
              focusedLeafId={focusedLeafId}
              tabActive={tabActive}
              canClose
            />
          </Panel>
        </Fragment>
      ))}
    </Group>
  )
}
