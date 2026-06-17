import { existsSync } from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'

const MANIFESTS = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml']

/**
 * Maps a terminal's cwd to its project root: nearest ancestor with `.git`,
 * else nearest ancestor with a known manifest, else the cwd itself.
 *
 * The walk STOPS at the home directory and never honors a marker found AT home
 * (unless the cwd literally is home). Many people keep a `.git` in `$HOME`
 * (dotfiles repos via `git init ~`, yadm, chezmoi); without this guard, every
 * project folder lacking its own `.git` would collapse straight up to `$HOME`,
 * so the dock would show `/Users/<name>` instead of the actual folder.
 *
 * `exists` / `home` are injectable for tests (mirrors the pattern in shellDetect).
 */
export function resolveProjectRoot(
  cwd: string,
  exists: (p: string) => boolean = existsSync,
  home: string = os.homedir()
): string {
  let manifestHit: string | null = null
  let dir = cwd
  for (;;) {
    const isHome = dir === home
    if (!isHome || dir === cwd) {
      if (exists(join(dir, '.git'))) return dir
      if (!manifestHit && MANIFESTS.some((m) => exists(join(dir, m)))) manifestHit = dir
    }
    if (isHome) break // never resolve at or above $HOME for a deeper cwd
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return manifestHit ?? cwd
}
