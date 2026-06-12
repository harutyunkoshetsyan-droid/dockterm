import { getProjectRoot } from './projectContext'
import { getCheckpoint, setCheckpoint } from './settingsService'
import { getStatus, headHash, isReachable } from './gitService'
import type { Checkpoint, CheckpointResult, CheckpointStatus } from '@shared/types'

/**
 * A checkpoint pins the current commit as "known good" so the Review panel can
 * later answer "what changed since I last trusted this repo?". Only allowed when
 * the working tree is clean — otherwise there's nothing stable to pin.
 */
export async function createCheckpoint(label: string): Promise<CheckpointResult> {
  const status = await getStatus()
  if (status.repoState === 'not-repo') throw new Error('Not a Git repository')
  if (status.repoState === 'empty') throw new Error('Make a commit before creating a checkpoint')
  if (!status.clean) return { dirty: true }

  const checkpoint: Checkpoint = {
    hash: await headHash(),
    branch: status.branch ?? 'HEAD',
    label: label.trim() || new Date().toLocaleString(),
    createdAt: Date.now()
  }
  setCheckpoint(getProjectRoot(), checkpoint)
  return { checkpoint }
}

export async function getCheckpointStatus(): Promise<CheckpointStatus> {
  const checkpoint = getCheckpoint(getProjectRoot())
  if (!checkpoint) return { checkpoint: null, stale: false }
  const reachable = await isReachable(checkpoint.hash)
  return { checkpoint, stale: !reachable }
}
