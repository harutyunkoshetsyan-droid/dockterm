import { realpathSync } from 'node:fs'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

export class JailViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JailViolation'
  }
}

/**
 * Resolves `relPath` (relative to `root`) to an absolute path guaranteed to stay
 * inside `root`, even across symlinks. Throws {@link JailViolation} otherwise.
 *
 * Steps:
 *  1. Canonicalize the root (realpath, symlink-free).
 *  2. Resolve the candidate against the canonical root.
 *  3. Canonicalize the nearest *existing* ancestor of the candidate, then
 *     re-attach the not-yet-existing tail — so a symlink partway down the path
 *     cannot smuggle the target outside the root.
 *  4. Containment check via path.relative, case-insensitive on Windows.
 */
export function resolveInside(root: string, relPath: string): string {
  const canonicalRoot = canonicalize(resolve(root))
  const candidate = isAbsolute(relPath) ? resolve(relPath) : resolve(canonicalRoot, relPath)
  const real = realpathNearest(candidate)
  if (!isInside(canonicalRoot, real)) {
    throw new JailViolation(`Path escapes project root: ${relPath}`)
  }
  return real
}

/** True if `child` is `root` itself or nested within it. */
export function isInside(root: string, child: string): boolean {
  const rel = relative(normalizeCase(root), normalizeCase(child))
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function canonicalize(p: string): string {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}

function realpathNearest(target: string): string {
  let existing = target
  const tail: string[] = []
  for (;;) {
    try {
      const real = realpathSync(existing)
      return tail.length ? resolve(real, ...tail.reverse()) : real
    } catch {
      const parent = resolve(existing, '..')
      if (parent === existing) return target // reached a non-existent root
      tail.push(basename(existing))
      existing = parent
    }
  }
}

function normalizeCase(p: string): string {
  return process.platform === 'win32' ? p.toLowerCase() : p
}
