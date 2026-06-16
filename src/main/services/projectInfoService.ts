import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { ProjectInfoData, ProjectScript } from '@shared/types'

const run = promisify(execFile)

function detectPackageManager(root: string): string | null {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(root, 'bun.lockb'))) return 'bun'
  if (existsSync(join(root, 'package-lock.json'))) return 'npm'
  if (existsSync(join(root, 'package.json'))) return 'npm'
  return null
}

function detectFrameworks(deps: Record<string, unknown>): string[] {
  const has = (name: string): boolean => Object.prototype.hasOwnProperty.call(deps, name)
  const out: string[] = []
  if (has('next')) out.push('Next.js')
  else if (has('react')) out.push('React')
  if (has('vue')) out.push('Vue')
  if (has('svelte')) out.push('Svelte')
  if (has('@angular/core')) out.push('Angular')
  if (has('vite')) out.push('Vite')
  if (has('electron')) out.push('Electron')
  if (has('@tauri-apps/api') || has('@tauri-apps/cli')) out.push('Tauri')
  if (has('express')) out.push('Express')
  if (has('fastify')) out.push('Fastify')
  if (has('typescript')) out.push('TypeScript')
  return out
}

export async function getProjectInfo(root: string): Promise<ProjectInfoData> {
  const pkgPath = join(root, 'package.json')

  let name: string | null = null
  let scripts: ProjectScript[] = []
  let frameworks: string[] = []

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        name?: unknown
        scripts?: Record<string, unknown>
        dependencies?: Record<string, unknown>
        devDependencies?: Record<string, unknown>
      }
      if (typeof pkg.name === 'string') name = pkg.name
      if (pkg.scripts && typeof pkg.scripts === 'object') {
        scripts = Object.entries(pkg.scripts).map(([n, cmd]) => ({ name: n, command: String(cmd) }))
      }
      frameworks = detectFrameworks({ ...pkg.dependencies, ...pkg.devDependencies })
    } catch {
      // malformed package.json — leave defaults
    }
  }

  if (existsSync(join(root, 'requirements.txt')) || existsSync(join(root, 'pyproject.toml'))) {
    frameworks.push('Python')
  }
  if (existsSync(join(root, 'Cargo.toml'))) frameworks.push('Rust')
  if (existsSync(join(root, 'go.mod'))) frameworks.push('Go')

  let remote: string | null = null
  try {
    remote = (await run('git', ['-C', root, 'remote', 'get-url', 'origin'])).stdout.trim() || null
  } catch {
    remote = null
  }

  return {
    name,
    root,
    packageManager: detectPackageManager(root),
    scripts,
    frameworks: [...new Set(frameworks)],
    remote
  }
}
