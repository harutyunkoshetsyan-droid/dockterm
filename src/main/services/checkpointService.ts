import { getCheckpoint, setCheckpoint } from './settingsService'
import { getStatus, headHash, isReachable } from './gitService'
import type { Checkpoint, CheckpointResult, CheckpointStatus } from '@shared/types'

/**
 * A checkpoint pins the current commit as "known good" so the Review panel can
 * later answer "what changed since I last trusted this repo?". Only allowed when
 * the working tree is clean — otherwise there's nothing stable to pin.
 */
export async function createCheckpoint(root: string, label: string): Promise<CheckpointResult> {
  const status = await getStatus(root)
  if (status.repoState === 'not-repo') throw new Error('Not a Git repository')
  if (status.repoState === 'empty') throw new Error('Make a commit before creating a checkpoint')
  if (!status.clean) return { dirty: true }

  const checkpoint: Checkpoint = {
    hash: await headHash(root),
    branch: status.branch ?? 'HEAD',
    label: label.trim() || new Date().toLocaleString(),
    createdAt: Date.now()
  }
  setCheckpoint(root, checkpoint)
  return { checkpoint }
}

export async function getCheckpointStatus(root: string): Promise<CheckpointStatus> {
  const checkpoint = getCheckpoint(root)
  if (!checkpoint) return { checkpoint: null, stale: false }
  const reachable = await isReachable(root, checkpoint.hash)
  return { checkpoint, stale: !reachable }
}
