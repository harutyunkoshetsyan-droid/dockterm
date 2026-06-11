import { execFile } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import type { ProjectInfo } from '@shared/types'

const run = promisify(execFile)

export function detectGitRepo(path: string): boolean {
  return existsSync(join(path, '.git'))
}

export async function getBranch(path: string): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['-C', path, 'rev-parse', '--abbrev-ref', 'HEAD'])
    const branch = stdout.trim()
    return branch && branch !== 'HEAD' ? branch : null
  } catch {
    return null
  }
}

export async function inspectProject(path: string): Promise<ProjectInfo> {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error('Selected path is not a folder')
  }
  const isGitRepo = detectGitRepo(path)
  const branch = isGitRepo ? await getBranch(path) : null
  return { path, name: basename(path) || path, isGitRepo, branch }
}

export async function initGitRepo(path: string): Promise<ProjectInfo> {
  await run('git', ['-C', path, 'init'])
  return inspectProject(path)
}
