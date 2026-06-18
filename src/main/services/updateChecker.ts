import { app, BrowserWindow, net, shell } from 'electron'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { getSettings, applySettingsPatch } from './settingsService'
import type { UpdateAvailable } from '@shared/ipc'

const REPO = 'munvard/dockterm'
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`
const SIX_HOURS = 6 * 60 * 60 * 1000

let timer: ReturnType<typeof setInterval> | null = null
/** The downloadable asset for THIS platform from the latest release, if found. */
let pendingAsset: { url: string; name: string } | null = null
let downloading = false

function parseVer(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
}

/** True if `latest` is a strictly higher semver than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVer(latest)
  const b = parseVer(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/** Trim the GitHub release body to just the "What's new" section: drop the HTML
 * comment header and everything from the first horizontal rule (the download
 * table + footer), so the popup reads cleanly from the first heading. */
export function cleanNotes(raw: string): string {
  let t = (raw ?? '').replace(/<!--[\s\S]*?-->/g, '')
  const rule = t.search(/\n\s*---/)
  if (rule >= 0) t = t.slice(0, rule)
  t = t.trim()
  if (t.length > 1600) {
    t = t.slice(0, 1600)
    t = t.slice(0, t.lastIndexOf('\n')) + '\n…' // never cut mid-line
  }
  return t
}

interface GhAsset {
  name?: string
  browser_download_url?: string
}
interface GhRelease {
  tag_name?: string
  html_url?: string
  body?: string
  draft?: boolean
  prerelease?: boolean
  assets?: GhAsset[]
}

/** Pick the installer asset matching this OS + arch from a release's assets. */
function pickAsset(assets: GhAsset[]): { url: string; name: string } | null {
  const find = (re: RegExp): { url: string; name: string } | null => {
    for (const a of assets) {
      if (a.name && a.browser_download_url && re.test(a.name)) {
        return { url: a.browser_download_url, name: a.name }
      }
    }
    return null
  }
  if (process.platform === 'win32') return find(/windows.*\.exe$/i) ?? find(/\.exe$/i)
  if (process.platform === 'darwin') {
    return process.arch === 'arm64'
      ? find(/apple-silicon\.dmg$/i) ?? find(/arm64\.dmg$/i) ?? find(/\.dmg$/i)
      : find(/intel\.dmg$/i) ?? find(/x64\.dmg$/i) ?? find(/\.dmg$/i)
  }
  if (process.platform === 'linux') return find(/linux.*\.appimage$/i) ?? find(/\.appimage$/i)
  return null
}

async function fetchLatest(): Promise<GhRelease | null> {
  try {
    const res = await net.fetch(LATEST_API, {
      headers: { 'User-Agent': 'DockTerm', Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) return null
    return (await res.json()) as GhRelease
  } catch {
    return null
  }
}

function send<T>(channel: string, payload: T): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

/**
 * Poll GitHub for a newer release. Auto checks respect the auto-check toggle and
 * the user's snooze/skip choices; a manual check ignores those. Returns the
 * update (and broadcasts it) when one is found, else null.
 */
export async function checkForUpdate(manual = false): Promise<UpdateAvailable | null> {
  const u = getSettings().update
  if (!manual && !u.checkAutomatically) return null
  const rel = await fetchLatest()
  if (!rel?.tag_name || rel.draft || rel.prerelease) return null
  const latest = rel.tag_name.replace(/^v/i, '')
  if (!isNewer(latest, app.getVersion())) return null
  if (!manual && (u.dismissedVersion === latest || Date.now() < u.remindAfter)) return null
  pendingAsset = pickAsset(rel.assets ?? [])
  const payload: UpdateAvailable = {
    latestVersion: latest,
    releaseUrl: rel.html_url || RELEASES_PAGE,
    notes: cleanNotes(rel.body ?? ''),
    canAutoUpdate: !!pendingAsset
  }
  send('update:available', payload)
  return payload
}

/** Download the matched installer for this platform (with progress), then open
 * it (Windows/macOS installer) or reveal it (Linux AppImage). No browser. */
export async function downloadAndInstall(): Promise<void> {
  if (downloading) return
  if (!pendingAsset) {
    send('update:error', { message: 'no-asset' })
    return
  }
  downloading = true
  const dest = join(app.getPath('downloads'), pendingAsset.name)
  try {
    const res = await net.fetch(pendingAsset.url, { headers: { 'User-Agent': 'DockTerm' } })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    const total = Number(res.headers.get('content-length') || 0)
    const out = createWriteStream(dest)
    const reader = res.body.getReader()
    let received = 0
    let lastPct = -1
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out.write(Buffer.from(value))
      received += value.length
      if (total) {
        const pct = Math.round((received / total) * 100)
        if (pct !== lastPct) {
          lastPct = pct
          send('update:progress', { percent: pct })
        }
      }
    }
    await new Promise<void>((resolve, reject) => {
      out.on('finish', () => resolve())
      out.on('error', reject)
      out.end()
    })
    send('update:downloaded', { path: dest })
    if (process.platform === 'linux') {
      shell.showItemInFolder(dest) // AppImage: reveal so the user can swap it in
    } else {
      await shell.openPath(dest) // run the installer (.exe) / mount the .dmg
    }
  } catch (e) {
    send('update:error', { message: e instanceof Error ? e.message : 'download failed' })
  } finally {
    downloading = false
  }
}

/** Start polling: shortly after launch, then every ~6 hours while open. */
export function startUpdateChecker(): void {
  if (timer) return
  setTimeout(() => void checkForUpdate(), 10_000)
  timer = setInterval(() => void checkForUpdate(), SIX_HOURS)
}

export function snoozeUpdate(hours: number): void {
  applySettingsPatch({ update: { ...getSettings().update, remindAfter: Date.now() + hours * 3_600_000 } })
}

export function skipUpdate(version: string): void {
  applySettingsPatch({ update: { ...getSettings().update, dismissedVersion: version } })
}
