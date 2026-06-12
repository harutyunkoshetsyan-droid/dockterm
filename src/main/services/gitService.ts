import { simpleGit, type SimpleGit } from 'simple-git'
import { getProjectRoot } from './projectContext'
import { statusToView, notRepoView } from './gitStatusMap'
import { readFile as readWorkingFile } from './fileService'
import type {
  GitStatusView,
  GitBranches,
  CommitResultView,
  GitFileStatus,
  ReviewBase,
  DiffSinceFile,
  DiffContent
} from '@shared/types'

/**
 * Every git invocation goes through here. `core.hooksPath=` neutralizes any hooks
 * the (possibly untrusted) project repo defines — opening a malicious repo must
 * never run its code (CVE-2024-32002 class). A block timeout stops a call from
 * hanging forever if a credential helper dialog is left open.
 */
function git(): SimpleGit {
  return simpleGit({
    baseDir: getProjectRoot(),
    // Set hooksPath to EMPTY so the (possibly untrusted) repo's hooks never run.
    // simple-git guards core.hooksPath against malicious *values*; we opt in
    // because our value is the empty string — the safe, hook-disabling direction.
    config: ['core.hooksPath='],
    unsafe: { allowUnsafeHooksPath: true },
    trimmed: true,
    timeout: { block: 120_000 }
  })
}

export async function getStatus(): Promise<GitStatusView> {
  const g = git()
  let isRepo = false
  try {
    isRepo = await g.checkIsRepo()
  } catch {
    isRepo = false
  }
  if (!isRepo) return notRepoView()

  let hasCommits = true
  try {
    await g.revparse(['--verify', 'HEAD'])
  } catch {
    hasCommits = false
  }
  return statusToView(await g.status(), hasCommits)
}

export async function stage(paths: string[]): Promise<void> {
  await git().add(paths)
}

export async function stageAll(): Promise<void> {
  await git().add(['-A'])
}

export async function unstage(paths: string[]): Promise<void> {
  await git().raw(['restore', '--staged', '--', ...paths])
}

export async function discard(paths: string[]): Promise<void> {
  await git().raw(['restore', '--', ...paths])
}

export async function commit(message: string): Promise<CommitResultView> {
  const result = await git().commit(message)
  const s = result.summary
  return {
    hash: result.commit || 'HEAD',
    summary: `${s.changes} file(s) changed, +${s.insertions} -${s.deletions}`
  }
}

export async function push(options: {
  setUpstream?: boolean
  forceWithLease?: boolean
}): Promise<string> {
  const g = git()
  const args: string[] = []
  if (options.forceWithLease) args.push('--force-with-lease')
  if (options.setUpstream) {
    const branch = (await g.status()).current ?? 'HEAD'
    args.push('--set-upstream', 'origin', branch)
  }
  const result = await g.push(args)
  const updates = (result.pushed ?? []).length
  const remote = result.repo ?? 'remote'
  return `Pushed ${updates} ref(s) to ${remote}.`
}

export async function pull(): Promise<string> {
  const r = await git().pull()
  return `Updated: ${r.summary.changes} change(s), +${r.summary.insertions} -${r.summary.deletions}.`
}

export async function branches(): Promise<GitBranches> {
  const b = await git().branchLocal()
  return { current: b.current || null, all: b.all }
}

export async function createBranch(name: string): Promise<void> {
  await git().checkoutLocalBranch(name)
}

export async function switchBranch(name: string): Promise<void> {
  await git().checkout(name)
}

export async function deleteBranch(name: string): Promise<void> {
  // Non-force: git refuses to delete a branch with unmerged commits.
  await git().deleteLocalBranch(name, false)
}

export async function headHash(): Promise<string> {
  return git().revparse(['HEAD'])
}

export async function isReachable(hash: string): Promise<boolean> {
  try {
    await git().raw(['cat-file', '-e', `${hash}^{commit}`])
    return true
  } catch {
    return false
  }
}

function parseNumstat(out: string): { path: string; ins: number; del: number }[] {
  const rows: { path: string; ins: number; del: number }[] = []
  for (const line of out.split('\n')) {
    const parts = line.trim().split('\t')
    if (parts.length < 3) continue
    const ins = parts[0] === '-' ? 0 : Number.parseInt(parts[0], 10) || 0
    const del = parts[1] === '-' ? 0 : Number.parseInt(parts[1], 10) || 0
    rows.push({ path: parts[2], ins, del })
  }
  return rows
}

/** Files changed relative to a baseline: the working tree (uncommitted), this
 * session (watcher-tracked), or a saved checkpoint commit. */
export async function changedSince(
  base: ReviewBase,
  checkpointHash: string | null,
  sessionPaths: string[]
): Promise<DiffSinceFile[]> {
  const g = git()

  if (base === 'checkpoint') {
    if (!checkpointHash) return []
    const numstat = await g.raw(['diff', '--numstat', checkpointHash])
    const files: DiffSinceFile[] = parseNumstat(numstat).map((n) => ({
      relPath: n.path,
      status: 'modified',
      insertions: n.ins,
      deletions: n.del
    }))
    const seen = new Set(files.map((f) => f.relPath))
    const status = await getStatus()
    for (const u of status.untracked) {
      if (!seen.has(u.path)) {
        files.push({ relPath: u.path, status: 'untracked', insertions: 0, deletions: 0 })
      }
    }
    return files
  }

  const status = await getStatus()
  const map = new Map<string, DiffSinceFile>()
  const add = (path: string, fileStatus: GitFileStatus) => {
    if (!map.has(path)) map.set(path, { relPath: path, status: fileStatus, insertions: 0, deletions: 0 })
  }
  for (const f of status.staged) add(f.path, f.status)
  for (const f of status.unstaged) add(f.path, f.status)
  for (const f of status.untracked) add(f.path, 'untracked')

  try {
    for (const n of parseNumstat(await g.raw(['diff', '--numstat', 'HEAD']))) {
      const entry = map.get(n.path)
      if (entry) {
        entry.insertions = n.ins
        entry.deletions = n.del
      }
    }
  } catch {
    // empty repo: no HEAD to diff against
  }

  let files = [...map.values()]
  if (base === 'session') {
    const allowed = new Set(sessionPaths)
    files = files.filter((f) => allowed.has(f.relPath))
  }
  return files
}

/** Original (baseline) and current content for a single file's diff view. */
export async function diffFile(
  base: ReviewBase,
  checkpointHash: string | null,
  relPath: string
): Promise<DiffContent> {
  const ref = base === 'checkpoint' && checkpointHash ? checkpointHash : 'HEAD'
  let original = ''
  try {
    original = await git().show([`${ref}:${relPath}`])
  } catch {
    original = '' // new file, or no baseline commit
  }
  let modified = ''
  try {
    const result = await readWorkingFile(relPath)
    modified = result.kind === 'text' ? result.content : ''
  } catch {
    modified = '' // deleted in the working tree
  }
  return { relPath, original, modified }
}
