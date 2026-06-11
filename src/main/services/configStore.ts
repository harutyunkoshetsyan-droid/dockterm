import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  copyFileSync
} from 'node:fs'
import { dirname } from 'node:path'

/**
 * Tiny atomic JSON store. Writes go to a temp file then rename (atomic replace on
 * both POSIX and Windows). A corrupt file is backed up to `<file>.bak` and the
 * defaults are used, so a bad write can never brick the app.
 */
export class ConfigStore<T extends object> {
  private data: T

  constructor(
    private readonly filePath: string,
    private readonly defaults: T,
    private readonly migrate?: (raw: unknown) => T
  ) {
    this.data = this.load()
  }

  private load(): T {
    try {
      if (!existsSync(this.filePath)) return structuredClone(this.defaults)
      const raw: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'))
      return this.migrate ? this.migrate(raw) : (raw as T)
    } catch {
      try {
        if (existsSync(this.filePath)) copyFileSync(this.filePath, `${this.filePath}.bak`)
      } catch {
        // best-effort backup; never throw out of load()
      }
      return structuredClone(this.defaults)
    }
  }

  get(): T {
    return this.data
  }

  set(next: T): void {
    this.data = next
    this.persist()
  }

  update(patch: Partial<T>): T {
    this.data = { ...this.data, ...patch }
    this.persist()
    return this.data
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    renameSync(tmp, this.filePath)
  }
}
