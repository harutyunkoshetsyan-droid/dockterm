# munu Character Picker + Interactive Pinnable Icon — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick which mascot character (munu · nvurd · guru · adanana) appears everywhere, and make the floating munu icon interactive — click it to surface the terminal *and* a tasteful quick-settings popup (size · character · pin), with pinning that keeps it always-visible and draggable anywhere on screen, plus a friendly first-time "drag me" hint.

**Architecture:** Two shippable milestones. **A — Character system:** add `munu.character` to settings, copy the three new SVG kits into the renderer, add a tiny mascot registry, give the `Munu` component a `character` prop, and add a card picker to the Settings panel. **B — Interactive icon:** add `munu.pinned` + `munu.position`, three new IPC channels (`munu:showApp`, `munu:getBounds`, `munu:move`), pinned-aware overlay placement, a quick-settings popup rendered in the existing overlay window, pointer-based drag, and a 5-second move hint. Everything reuses the existing settings broadcast (`settings:set` → `settings:changed`) — no new persistence path.

**Tech Stack:** Electron 42 (main + overlay BrowserWindow), React 19 + TypeScript (strict), zustand, zod (settings schema), Vite (`?raw` SVG imports), vitest (unit tests). Verify with `npm run typecheck`, `npm test`, and `npm run dev` (manual).

---

## Assumptions & decisions (confirm or veto in review)

1. **The "munu icon on top" = the existing Dynamic-Island overlay** (`src/main/overlayWindow.ts`). All icon behavior extends that single global window.
2. **Single click on the icon (when no ask-card is showing) does BOTH:** brings the DockTerm window(s) forward ("show the terminal") **and** toggles the quick-settings popup. When munu is showing an ask-card (Claude needs `[y/n]`), click keeps today's behavior (the card owns the interaction).
3. **Pin = always-visible + drag-anywhere on any display.** Pinned munu never auto-tucks; position is clamped to a display's work area so it can't be lost off-screen; position persists across launches.
4. **Size & character controls in the popup are click-only** (a `−/+` stepper and character cards) so the non-focusable overlay never needs keyboard focus — keeps it from stealing focus from your terminal.
5. **Default everywhere is `munu`** (zod `.default('munu')`), `pinned: false`, `position: null`, `size: 56` (unchanged).
6. **Product fit:** this enhances an *already opt-in* feature (`munu.enabled`/`munu.overlay`). It adds no telemetry, no network, no new capability — just personalization + a faster route to existing settings. It must stay tasteful and fully disable-able (the existing toggles still govern it).

---

## File structure

**New files**
- `src/renderer/src/assets/nvurd/{nvurd,nvurd-happy,nvurd-working,nvurd-sleeping,nvurd-asking}.svg` — copied from repo-root `assets/nvurd/`.
- `src/renderer/src/assets/guru/…` and `src/renderer/src/assets/adanana/…` — same five each.
- `src/renderer/src/components/munu/mascots.ts` — character registry + pure `artFor()` resolver.
- `src/renderer/src/components/munu/mascots.test.ts` — unit tests for the resolver.
- `src/main/overlayPlacement.ts` — pure `clampToAreas()` for keeping the window on-screen.
- `src/main/overlayPlacement.test.ts` — unit tests.
- `src/main/services/munuReveal.ts` — pure `wantReveal()` (so pinned-forces-visible is testable).
- `src/main/services/munuReveal.test.ts` — unit tests.
- `src/renderer/overlay/MunuPopup.tsx` — the quick-settings popup (size stepper, character cards, pin toggle, "open DockTerm").

**Modified files**
- `src/shared/types.ts` — `MascotCharacter` type; extend `MunuSettings`.
- `src/main/services/settingsService.ts` — extend the `munu` zod object.
- `src/shared/ipc.ts` — 3 new invoke channels + allowlist entries.
- `src/main/ipc/handlers/munu.ts` — handlers for the 3 channels.
- `src/main/overlayWindow.ts` — pinned-aware placement + `moveOverlay()` + `getOverlayBounds()`.
- `src/main/services/munuService.ts` — `wantReveal()` in poll; `showMainWindows()`; re-place on settings change.
- `src/renderer/src/components/munu/Munu.tsx` — `character` prop.
- `src/renderer/src/components/common/UpdatePopup.tsx` — pass selected character.
- `src/renderer/overlay/main.tsx` — character, click→show+popup, drag, hint.
- `src/renderer/overlay/overlay.css` — popup, hint, arrow styles.
- `src/renderer/src/components/settings/SettingsPanel.tsx` — character card grid + pin controls.
- `src/renderer/src/styles/components.css` — character-card styles (reuse `.theme-grid`).

---

# Milestone A — Character system (shippable on its own)

### Task A1: Bring the three character kits into the renderer

**Files:**
- Create: `src/renderer/src/assets/nvurd/*.svg`, `src/renderer/src/assets/guru/*.svg`, `src/renderer/src/assets/adanana/*.svg`

- [ ] **Step 1: Copy the five state SVGs for each character** (Git Bash)

```bash
cd /e/dockterm
for c in nvurd guru adanana; do
  mkdir -p "src/renderer/src/assets/$c"
  cp "assets/$c/$c.svg" "assets/$c/$c-happy.svg" "assets/$c/$c-working.svg" \
     "assets/$c/$c-sleeping.svg" "assets/$c/$c-asking.svg" "src/renderer/src/assets/$c/"
done
```

- [ ] **Step 2: Verify all 15 files landed**

Run: `ls src/renderer/src/assets/nvurd src/renderer/src/assets/guru src/renderer/src/assets/adanana`
Expected: each folder lists exactly the 5 files (`<char>.svg`, `-happy`, `-working`, `-sleeping`, `-asking`).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/assets/nvurd src/renderer/src/assets/guru src/renderer/src/assets/adanana
git commit -m "assets: vendor nvurd/guru/adanana mascot kits into renderer"
```

---

### Task A2: Add the character type + setting

**Files:**
- Modify: `src/shared/types.ts` (MunuState ~line 16; MunuSettings lines 55-64)
- Modify: `src/main/services/settingsService.ts` (munu zod block ~lines 83-93)

- [ ] **Step 1: Add `MascotCharacter` type and extend `MunuSettings`** in `src/shared/types.ts`

Add right after the `MunuState` type (near line 17):

```typescript
/** Which mascot character the user has chosen. Default 'munu'. */
export type MascotCharacter = 'munu' | 'nvurd' | 'guru' | 'adanana'
```

Replace the existing `MunuSettings` type with:

```typescript
export type MunuSettings = {
  enabled: boolean
  overlay: boolean
  sounds: boolean
  attention: boolean
  keepAwake: boolean
  notifications: boolean
  /** Overlay munu face size in px (the notch pill). Default 56. */
  size: number
  /** The chosen mascot character. Default 'munu'. */
  character: MascotCharacter
  /** When true, the icon stays visible and is draggable. Default false. */
  pinned: boolean
  /** Persisted screen position when pinned (top-left of the overlay window). */
  position: { x: number; y: number } | null
}
```

- [ ] **Step 2: Extend the zod `munu` schema** in `src/main/services/settingsService.ts` (replace the `.object({…})` body of the `munu` preference, keeping the existing keys):

```typescript
  munu: z
    .object({
      enabled: z.boolean().default(true),
      overlay: z.boolean().default(true),
      sounds: z.boolean().default(true),
      attention: z.boolean().default(true),
      keepAwake: z.boolean().default(true),
      notifications: z.boolean().default(true),
      size: z.number().int().min(36).max(120).default(56),
      character: z.enum(['munu', 'nvurd', 'guru', 'adanana']).default('munu'),
      pinned: z.boolean().default(false),
      position: z.object({ x: z.number(), y: z.number() }).nullable().default(null)
    })
    .default({})
```

No `schemaVersion` bump is needed — existing config files auto-fill the three new keys via `.default()` on next parse. `settingsPatchSchema` already includes `munu`, so the renderer can write these.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no usages of the new fields yet; the types just widen).

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/main/services/settingsService.ts
git commit -m "feat(munu): add character/pinned/position settings (default munu)"
```

---

### Task A3: Mascot registry + resolver (TDD)

**Files:**
- Create: `src/renderer/src/components/munu/mascots.ts`
- Test: `src/renderer/src/components/munu/mascots.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/renderer/src/components/munu/mascots.test.ts
import { describe, it, expect } from 'vitest'
import { artFor, CHARACTERS } from './mascots'

describe('mascots', () => {
  it('lists all four characters with munu first', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(['munu', 'nvurd', 'guru', 'adanana'])
  })

  it('returns distinct art per state', () => {
    expect(artFor('munu', 'idle', false)).not.toEqual(artFor('munu', 'working', false))
  })

  it('sleeping overrides the live state', () => {
    expect(artFor('guru', 'working', true)).toEqual(artFor('guru', 'idle', true))
  })

  it('different characters return different art for the same state', () => {
    expect(artFor('nvurd', 'idle', false)).not.toEqual(artFor('adanana', 'idle', false))
  })

  it('falls back to munu for an unknown character', () => {
    // @ts-expect-error testing runtime fallback
    expect(artFor('bogus', 'idle', false)).toEqual(artFor('munu', 'idle', false))
  })
})
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm test -- mascots`
Expected: FAIL — `Cannot find module './mascots'`.

- [ ] **Step 3: Implement the registry**

```typescript
// src/renderer/src/components/munu/mascots.ts
import type { MunuState } from '../../state/munuAggregate'
import type { MascotCharacter } from '@shared/types'

// munu
import muIdle from '../../assets/munu/munu.svg?raw'
import muHappy from '../../assets/munu/munu-happy.svg?raw'
import muWork from '../../assets/munu/munu-working.svg?raw'
import muSleep from '../../assets/munu/munu-sleeping.svg?raw'
import muAsk from '../../assets/munu/munu-asking.svg?raw'
// nvurd
import nvIdle from '../../assets/nvurd/nvurd.svg?raw'
import nvHappy from '../../assets/nvurd/nvurd-happy.svg?raw'
import nvWork from '../../assets/nvurd/nvurd-working.svg?raw'
import nvSleep from '../../assets/nvurd/nvurd-sleeping.svg?raw'
import nvAsk from '../../assets/nvurd/nvurd-asking.svg?raw'
// guru
import guIdle from '../../assets/guru/guru.svg?raw'
import guHappy from '../../assets/guru/guru-happy.svg?raw'
import guWork from '../../assets/guru/guru-working.svg?raw'
import guSleep from '../../assets/guru/guru-sleeping.svg?raw'
import guAsk from '../../assets/guru/guru-asking.svg?raw'
// adanana
import adIdle from '../../assets/adanana/adanana.svg?raw'
import adHappy from '../../assets/adanana/adanana-happy.svg?raw'
import adWork from '../../assets/adanana/adanana-working.svg?raw'
import adSleep from '../../assets/adanana/adanana-sleeping.svg?raw'
import adAsk from '../../assets/adanana/adanana-asking.svg?raw'

/** One character's art, keyed by the four live states + the sleeping override. */
type ArtSet = Record<MunuState, string> & { sleeping: string }

const SETS: Record<MascotCharacter, ArtSet> = {
  munu: { idle: muIdle, working: muWork, asking: muAsk, done: muHappy, sleeping: muSleep },
  nvurd: { idle: nvIdle, working: nvWork, asking: nvAsk, done: nvHappy, sleeping: nvSleep },
  guru: { idle: guIdle, working: guWork, asking: guAsk, done: guHappy, sleeping: guSleep },
  adanana: { idle: adIdle, working: adWork, asking: adAsk, done: adHappy, sleeping: adSleep }
}

/** Picker metadata. munu is first so it reads as the default. */
export const CHARACTERS: { id: MascotCharacter; label: string; blurb: string }[] = [
  { id: 'munu', label: 'munu', blurb: 'the original · calm violet' },
  { id: 'nvurd', label: 'nvurd', blurb: 'cheerful · bow · rose' },
  { id: 'guru', label: 'guru', blurb: 'wise · glasses · green' },
  { id: 'adanana', label: 'adanana', blurb: 'sunny · banana · amber' }
]

/** Resolve the raw SVG for a character + state. `sleeping` overrides everything. */
export function artFor(character: MascotCharacter, state: MunuState, sleeping: boolean): string {
  const set = SETS[character] ?? SETS.munu
  return sleeping ? set.sleeping : set[state]
}
```

- [ ] **Step 4: Run tests; verify they pass**

Run: `npm test -- mascots`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/munu/mascots.ts src/renderer/src/components/munu/mascots.test.ts
git commit -m "feat(munu): mascot registry + artFor resolver (tested)"
```

---

### Task A4: Give `Munu` a `character` prop

**Files:**
- Modify: `src/renderer/src/components/munu/Munu.tsx` (whole file)

- [ ] **Step 1: Replace the component to use the registry**

```typescript
// src/renderer/src/components/munu/Munu.tsx
import type { MunuState } from '../../state/munuAggregate'
import type { MascotCharacter } from '@shared/types'
import { artFor } from './mascots'
import './munu.css'

/** The live, animated mascot. `done` shows the happy face; `sleeping` overrides all. */
export function Munu({
  state,
  character = 'munu',
  sleeping: isSleeping = false,
  size = 24
}: {
  state: MunuState
  character?: MascotCharacter
  sleeping?: boolean
  size?: number
}) {
  const kind = isSleeping ? 'sleeping' : state
  const raw = artFor(character, state, isSleeping)
  return (
    <span
      className={`munu munu--${kind}`}
      style={{ width: size, height: size }}
      // Bundled, trusted asset — not user input.
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Existing `<Munu state=… size=… />` callers still compile (`character` defaults to `'munu'`).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/munu/Munu.tsx
git commit -m "feat(munu): Munu accepts a character prop (defaults to munu)"
```

---

### Task A5: Feed the chosen character into every render site

**Files:**
- Modify: `src/renderer/overlay/main.tsx` (state ~line 39; render ~line 213)
- Modify: `src/renderer/src/components/common/UpdatePopup.tsx` (~line 103)

- [ ] **Step 1: Overlay — track the character from settings.** In `src/renderer/overlay/main.tsx`, add a state and read it where `munuSize`/`sounds` are read.

Add near the other `useState`s (after line 39):

```typescript
  const [character, setCharacter] = useState<MascotCharacter>('munu')
```

Import the type at the top (extend the existing `@shared/types` import):

```typescript
import type { MascotCharacter, MunuAsk, MunuGlobal, MunuState } from '@shared/types'
```

In the existing settings effect (lines 54-68), set it in both the initial read and the `settings:changed` listener:

```typescript
  useEffect(() => {
    void window.dockterm.invoke('settings:get', undefined).then((r) => {
      if (r.ok) {
        setSounds(r.value.munu.sounds)
        setMunuSize(r.value.munu.size)
        setCharacter(r.value.munu.character)
      }
    })
    void window.dockterm.invoke('app:getInfo', undefined).then((r) => {
      if (r.ok) setPlatform(r.value.platform)
    })
    return window.dockterm.on('settings:changed', (s) => {
      setSounds(s.munu.sounds)
      setMunuSize(s.munu.size)
      setCharacter(s.munu.character)
    })
  }, [])
```

Pass it to `<Munu>` (line 213):

```typescript
        <Munu
          state={g.state}
          character={character}
          size={showCard ? Math.round(munuSize * 0.75) : munuSize}
        />
```

- [ ] **Step 2: UpdatePopup — use the chosen character.** In `src/renderer/src/components/common/UpdatePopup.tsx`, read the setting from the app store and pass it.

Add near the top of the component body (the store is `useAppStore`; settings may be null before init):

```typescript
  const character = useAppStore((s) => s.settings?.munu.character) ?? 'munu'
```

Ensure `useAppStore` is imported (it is used across the app, e.g. `import { useAppStore } from '../../state/useAppStore'`). Then update the render (line ~103):

```typescript
        <Munu state="done" character={character} size={52} />
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run: `npm run dev`. With the app open, no visible change yet (still munu). This wires the read path; the picker (next task) flips it.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/overlay/main.tsx src/renderer/src/components/common/UpdatePopup.tsx
git commit -m "feat(munu): render the chosen character in overlay + update popup"
```

---

### Task A6: Character picker in Settings

**Files:**
- Modify: `src/renderer/src/components/settings/SettingsPanel.tsx` (munu Section ~lines 264-299)
- Modify: `src/renderer/src/styles/components.css` (append character-card styles)

- [ ] **Step 1: Import the registry** at the top of `SettingsPanel.tsx`:

```typescript
import { CHARACTERS } from '../munu/mascots'
import { Munu } from '../munu/Munu'
```

- [ ] **Step 2: Add the picker as the first control inside the `<Section title="munu">`** (immediately under the opening tag, before "Enable munu"):

```tsx
        <Field label="Character">
          <span className="settings-note settings-note--inline">
            pick who lives on your screen
          </span>
        </Field>
        <div className="char-grid">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`char-card${s.munu.character === c.id ? ' is-active' : ''}`}
              onClick={() => setMunu({ character: c.id })}
              title={c.blurb}
              aria-pressed={s.munu.character === c.id}
            >
              <Munu state="idle" character={c.id} size={48} />
              <span className="char-card__name">{c.label}</span>
            </button>
          ))}
        </div>
```

- [ ] **Step 3: Append styles** to `src/renderer/src/styles/components.css`:

```css
/* munu character picker — a 2×2 grid of live mascot faces. */
.char-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 4px 0 8px;
}
.char-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform 0.1s var(--ease), border-color 0.12s var(--ease);
}
.char-card:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
}
.char-card.is-active {
  border-color: var(--accent);
  outline: 1px solid var(--accent);
}
.char-card__name {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-dim);
}
.char-card.is-active .char-card__name {
  color: var(--text);
}
.settings-note--inline {
  font-size: 11px;
}
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Open Settings → munu. Confirm: four live mascot cards, munu selected by default, clicking a card immediately changes the overlay icon (and the Update popup if shown). Reopen the app — the choice persists.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` (Expected: PASS)

```bash
git add src/renderer/src/components/settings/SettingsPanel.tsx src/renderer/src/styles/components.css
git commit -m "feat(settings): live mascot character picker"
```

**✅ Milestone A is shippable here** — users can choose their character everywhere; default is munu.

---

# Milestone B — Interactive, pinnable, draggable icon

### Task B1: IPC channels for show / bounds / move

**Files:**
- Modify: `src/shared/ipc.ts` (invoke channel map ~lines 236-248; `INVOKE_CHANNELS` array ~lines 334-339)

- [ ] **Step 1: Add the three channel signatures** in the invoke map, next to the other `munu:*` entries:

```typescript
  /** Bring the DockTerm window(s) to the front (used when munu is clicked). */
  'munu:showApp': (req: void) => Result<void>
  /** Read the overlay window's current screen bounds (drag start reference). */
  'munu:getBounds': (req: void) => Result<{ x: number; y: number; width: number; height: number }>
  /** Move the overlay window to an absolute screen position (clamped on-screen). */
  'munu:move': (req: { x: number; y: number }) => Result<void>
```

- [ ] **Step 2: Add them to the `INVOKE_CHANNELS` allowlist array** (so the preload bridge forwards them):

```typescript
  'munu:showApp',
  'munu:getBounds',
  'munu:move',
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: FAIL — the handlers don't exist yet (if the IPC registry exhaustively checks channels) **or** PASS if handlers are looked up dynamically. Either way the next task adds handlers. (If FAIL, it names the missing handler keys — that's expected.)

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc.ts
git commit -m "feat(munu): declare munu:showApp/getBounds/move channels"
```

---

### Task B2: On-screen clamp helper (TDD)

**Files:**
- Create: `src/main/overlayPlacement.ts`
- Test: `src/main/overlayPlacement.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/overlayPlacement.test.ts
import { describe, it, expect } from 'vitest'
import { clampToAreas } from './overlayPlacement'

const area = { x: 0, y: 0, width: 1000, height: 800 }

describe('clampToAreas', () => {
  it('leaves an in-bounds box untouched', () => {
    expect(clampToAreas({ x: 100, y: 100, width: 200, height: 150 }, [area])).toEqual({ x: 100, y: 100 })
  })
  it('pulls a box back inside the right/bottom edges', () => {
    expect(clampToAreas({ x: 950, y: 760, width: 200, height: 150 }, [area])).toEqual({ x: 800, y: 650 })
  })
  it('pulls a box back inside the top/left edges', () => {
    expect(clampToAreas({ x: -50, y: -30, width: 200, height: 150 }, [area])).toEqual({ x: 0, y: 0 })
  })
  it('clamps to the nearest area when multiple displays exist', () => {
    const second = { x: 1000, y: 0, width: 1000, height: 800 }
    // Box centered on the second display clamps within it, not the first.
    expect(clampToAreas({ x: 1900, y: 100, width: 200, height: 150 }, [area, second])).toEqual({
      x: 1800,
      y: 100
    })
  })
})
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npm test -- overlayPlacement`
Expected: FAIL — `Cannot find module './overlayPlacement'`.

- [ ] **Step 3: Implement**

```typescript
// src/main/overlayPlacement.ts
export interface Box {
  x: number
  y: number
  width: number
  height: number
}
export interface Area {
  x: number
  y: number
  width: number
  height: number
}

const centerX = (b: { x: number; width: number }): number => b.x + b.width / 2
const centerY = (b: { y: number; height: number }): number => b.y + b.height / 2

/** Clamp `box`'s top-left so the box stays fully within the nearest work area. */
export function clampToAreas(box: Box, areas: Area[]): { x: number; y: number } {
  if (areas.length === 0) return { x: Math.round(box.x), y: Math.round(box.y) }
  // Choose the area whose center is closest to the box center.
  const bx = centerX(box)
  const by = centerY(box)
  let best = areas[0]
  let bestDist = Infinity
  for (const a of areas) {
    const dx = centerX(a) - bx
    const dy = centerY(a) - by
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      best = a
    }
  }
  const maxX = best.x + best.width - box.width
  const maxY = best.y + best.height - box.height
  const x = Math.round(Math.min(Math.max(box.x, best.x), Math.max(best.x, maxX)))
  const y = Math.round(Math.min(Math.max(box.y, best.y), Math.max(best.y, maxY)))
  return { x, y }
}
```

- [ ] **Step 4: Run tests; verify pass**

Run: `npm test -- overlayPlacement`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/overlayPlacement.ts src/main/overlayPlacement.test.ts
git commit -m "feat(overlay): clampToAreas placement helper (tested)"
```

---

### Task B3: Reveal-when-pinned helper (TDD)

**Files:**
- Create: `src/main/services/munuReveal.ts`
- Test: `src/main/services/munuReveal.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/main/services/munuReveal.test.ts
import { describe, it, expect } from 'vitest'
import { wantReveal } from './munuReveal'

const base = { pinned: false, cursorInZone: false, hasUnseenAsk: false, peekActive: false }

describe('wantReveal', () => {
  it('hidden when nothing applies', () => {
    expect(wantReveal(base)).toBe(false)
  })
  it('always revealed when pinned', () => {
    expect(wantReveal({ ...base, pinned: true })).toBe(true)
  })
  it('revealed for an unseen ask', () => {
    expect(wantReveal({ ...base, hasUnseenAsk: true })).toBe(true)
  })
  it('revealed while the cursor is in the zone or a peek is active', () => {
    expect(wantReveal({ ...base, cursorInZone: true })).toBe(true)
    expect(wantReveal({ ...base, peekActive: true })).toBe(true)
  })
})
```

- [ ] **Step 2: Run; verify fail**

Run: `npm test -- munuReveal`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// src/main/services/munuReveal.ts
/** Whether the floating munu should be revealed (slid down) right now.
 * Pinned forces it permanently visible; otherwise it peeks for asks/cursor/peek. */
export function wantReveal(opts: {
  pinned: boolean
  cursorInZone: boolean
  hasUnseenAsk: boolean
  peekActive: boolean
}): boolean {
  return opts.pinned || opts.hasUnseenAsk || opts.cursorInZone || opts.peekActive
}
```

- [ ] **Step 4: Run; verify pass**

Run: `npm test -- munuReveal`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/services/munuReveal.ts src/main/services/munuReveal.test.ts
git commit -m "feat(munu): wantReveal helper — pinned forces visible (tested)"
```

---

### Task B4: Pinned-aware overlay placement + move/bounds

**Files:**
- Modify: `src/main/overlayWindow.ts` (whole positioning section)

- [ ] **Step 1: Add imports** at the top of `src/main/overlayWindow.ts`:

```typescript
import { getSettings } from './services/settingsService'
import { clampToAreas } from './overlayPlacement'
```

(`screen` is already imported in this file.)

- [ ] **Step 2: Add a single placement function** and use it everywhere the window is positioned. Replace the existing `topCenter()` / `repositionOverlay()` / `resizeOverlay()` block with:

```typescript
function placeOverlay(width: number, height: number): void {
  if (!overlay || overlay.isDestroyed()) return
  const m = getSettings().munu
  const w = Math.round(Math.min(Math.max(width, 120), screen.getPrimaryDisplay().workArea.width - 16))
  const h = Math.round(Math.min(Math.max(height, 80), screen.getPrimaryDisplay().bounds.height - 24))
  if (m.pinned && m.position) {
    const areas = screen.getAllDisplays().map((d) => d.workArea)
    const { x, y } = clampToAreas({ x: m.position.x, y: m.position.y, width: w, height: h }, areas)
    overlay.setBounds({ x, y, width: w, height: h })
  } else {
    const d = screen.getPrimaryDisplay()
    const x = Math.round(d.bounds.x + (d.bounds.width - w) / 2)
    overlay.setBounds({ x, y: d.bounds.y, width: w, height: h })
  }
}

/** Re-apply placement (call on display change or when pin/position settings change). */
export function repositionOverlay(): void {
  if (!overlay || overlay.isDestroyed()) return
  const b = overlay.getBounds()
  placeOverlay(b.width, b.height)
}

/** Resize to fit content; respects pinned position (won't recenter when pinned). */
export function resizeOverlay(width: number, height: number): void {
  placeOverlay(width, height)
}

/** Current screen bounds, or null if the overlay isn't up. */
export function getOverlayBounds(): { x: number; y: number; width: number; height: number } | null {
  if (!overlay || overlay.isDestroyed()) return null
  const b = overlay.getBounds()
  return { x: b.x, y: b.y, width: b.width, height: b.height }
}

/** Move to an absolute screen position, clamped to stay on a display. */
export function moveOverlay(x: number, y: number): void {
  if (!overlay || overlay.isDestroyed()) return
  const b = overlay.getBounds()
  const areas = screen.getAllDisplays().map((d) => d.workArea)
  const p = clampToAreas({ x, y, width: b.width, height: b.height }, areas)
  overlay.setPosition(p.x, p.y)
}
```

- [ ] **Step 3: Use `placeOverlay` at creation.** In `createOverlayWindow()`, the initial `x,y` from `topCenter()` is now redundant; keep creating at `0,0` then place on ready. Change the `ready-to-show` handler to:

```typescript
  overlay.once('ready-to-show', () => {
    placeOverlay(W, H)
    overlay?.showInactive()
    reassertOverlayLevel()
  })
```

If `createOverlayWindow` still references `topCenter()` for the constructor `x/y`, replace those with `x: 0, y: 0` (placement happens on ready). Remove the now-unused `topCenter` function.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (exports `repositionOverlay`/`resizeOverlay` keep the same names used by `munuService`/handlers; new `getOverlayBounds`/`moveOverlay` are additive).

- [ ] **Step 5: Commit**

```bash
git add src/main/overlayWindow.ts
git commit -m "feat(overlay): pinned-aware placement + moveOverlay/getOverlayBounds"
```

---

### Task B5: Wire reveal-when-pinned, showMainWindows, and the new handlers

**Files:**
- Modify: `src/main/services/munuService.ts` (pollReveal ~lines 34-49; add `showMainWindows`; syncOverlay ~lines 189-204)
- Modify: `src/main/ipc/handlers/munu.ts` (register handlers)

- [ ] **Step 1: Use `wantReveal` in the poll.** In `munuService.ts`, import it and the overlay placement:

```typescript
import { wantReveal } from './munuReveal'
```

Replace the `want` computation inside `pollReveal()`:

```typescript
  const hasUnseenAsk = [...windowStates.values()].some((g) => g.asks.some((a) => !a.visible))
  const want = wantReveal({
    pinned: getSettings().munu.pinned,
    cursorInZone: inRevealZone(),
    hasUnseenAsk,
    peekActive: Date.now() < peekUntil
  })
```

- [ ] **Step 2: Add `showMainWindows()`** to `munuService.ts` (it already imports `BrowserWindow` and `getOverlay`):

```typescript
/** Bring DockTerm's real window(s) to the front — used when munu is clicked.
 * Excludes the overlay itself (which is never focusable). */
export function showMainWindows(): void {
  const ov = getOverlay()
  const wins = BrowserWindow.getAllWindows().filter((w) => w !== ov && !w.isDestroyed())
  for (const w of wins) {
    if (w.isMinimized()) w.restore()
    w.show()
  }
  wins[wins.length - 1]?.focus()
}
```

- [ ] **Step 3: Re-place on settings change.** In `syncOverlay()`, after the overlay is ensured to exist (the `if (m.enabled && m.overlay)` branch, right after `createOverlayWindow()`), add a reposition so a pin/position change is applied immediately:

```typescript
    if (m.enabled && m.overlay) {
      createOverlayWindow()
      repositionOverlay()
      startCursorPoll()
      pushGlobal()
    } else {
```

Add `repositionOverlay` to the existing import from `'../overlayWindow'`.

- [ ] **Step 4: Register the three handlers** in `src/main/ipc/handlers/munu.ts`. Add imports:

```typescript
import { getOverlayBounds, moveOverlay } from '../../overlayWindow'
import { showMainWindows } from '../../services/munuService'
```

Register next to the existing `munu:focus` handler (follow the file's `reg(channel, schema, fn)` pattern; these take no/simple input — use the same no-arg/void schema the other munu handlers use, e.g. `z.void()` or the project's `noArgs`):

```typescript
  reg('munu:showApp', z.void(), () => {
    showMainWindows()
    return ok(undefined)
  })

  reg('munu:getBounds', z.void(), () => {
    const b = getOverlayBounds()
    if (!b) return err('UNAVAILABLE', 'overlay not present')
    return ok(b)
  })

  reg('munu:move', z.object({ x: z.number(), y: z.number() }), (req) => {
    moveOverlay(req.x, req.y)
    return ok(undefined)
  })
```

Match the file's actual helpers for `ok`/`err`/the void schema (check the top of `munu.ts` and a neighbor handler like `settings.ts` for the exact `ok`/`err` imports and the void-input convention). If the project uses a shared `z.void()`-style schema for no-arg channels, reuse it verbatim.

- [ ] **Step 5: Typecheck + unit tests**

Run: `npm run typecheck && npm test`
Expected: PASS (all unit tests green; types resolve).

- [ ] **Step 6: Commit**

```bash
git add src/main/services/munuService.ts src/main/ipc/handlers/munu.ts
git commit -m "feat(munu): reveal-when-pinned, showMainWindows, move/bounds handlers"
```

---

### Task B6: The quick-settings popup component

**Files:**
- Create: `src/renderer/overlay/MunuPopup.tsx`
- Modify: `src/renderer/overlay/overlay.css` (append styles)

- [ ] **Step 1: Create the popup** — click-only controls (stepper + cards + toggle), no keyboard focus needed:

```tsx
// src/renderer/overlay/MunuPopup.tsx
import type { MascotCharacter } from '@shared/types'
import { Munu } from '@renderer/components/munu/Munu'
import { CHARACTERS } from '@renderer/components/munu/mascots'

const SIZE_MIN = 36
const SIZE_MAX = 120
const SIZE_STEP = 8

export function MunuPopup({
  size,
  character,
  pinned,
  onSize,
  onCharacter,
  onPin,
  onOpenApp
}: {
  size: number
  character: MascotCharacter
  pinned: boolean
  onSize: (next: number) => void
  onCharacter: (c: MascotCharacter) => void
  onPin: (next: boolean) => void
  onOpenApp: () => void
}) {
  const clamp = (n: number): number => Math.min(SIZE_MAX, Math.max(SIZE_MIN, n))
  return (
    <div className="mpop" onClick={(e) => e.stopPropagation()}>
      <div className="mpop__row">
        <span className="mpop__label">Size</span>
        <div className="mpop__stepper">
          <button
            className="mpop__btn"
            disabled={size <= SIZE_MIN}
            onClick={() => onSize(clamp(size - SIZE_STEP))}
            title="Smaller"
          >
            −
          </button>
          <span className="mpop__val">{size}</span>
          <button
            className="mpop__btn"
            disabled={size >= SIZE_MAX}
            onClick={() => onSize(clamp(size + SIZE_STEP))}
            title="Bigger"
          >
            +
          </button>
        </div>
      </div>

      <div className="mpop__label mpop__label--block">Character</div>
      <div className="mpop__chars">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            className={`mpop__char${character === c.id ? ' is-active' : ''}`}
            onClick={() => onCharacter(c.id)}
            title={c.blurb}
            aria-pressed={character === c.id}
          >
            <Munu state="idle" character={c.id} size={34} />
          </button>
        ))}
      </div>

      <div className="mpop__row">
        <span className="mpop__label">
          Pin to screen
          <span className="mpop__hint">always visible · drag anywhere</span>
        </span>
        <button
          className={`mpop__toggle${pinned ? ' is-on' : ''}`}
          role="switch"
          aria-checked={pinned}
          onClick={() => onPin(!pinned)}
        >
          <span className="mpop__knob" />
        </button>
      </div>

      <button className="mpop__open" onClick={onOpenApp}>
        Open DockTerm
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Append popup styles** to `src/renderer/overlay/overlay.css` (the overlay has its own tokens; mirror the app's look with literal values so it stands alone):

```css
/* munu quick-settings popup */
.mpop {
  margin-top: 8px;
  width: 230px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #131319;
  border: 1px solid #2a2a33;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  font-family: var(--font-ui, sans-serif);
  color: #e8e8ed;
  cursor: default;
}
.mpop__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.mpop__label {
  font-size: 12.5px;
  color: #cfcfd6;
  display: flex;
  flex-direction: column;
}
.mpop__label--block {
  margin-bottom: -2px;
}
.mpop__hint {
  font-size: 10px;
  color: #7c7c86;
}
.mpop__stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mpop__btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #3a3a46;
  background: #1b1b23;
  color: #e8e8ed;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.mpop__btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.mpop__btn:not(:disabled):hover {
  border-color: #7c6bff;
}
.mpop__val {
  min-width: 28px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
}
.mpop__chars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.mpop__char {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  background: #1b1b23;
  border: 1px solid #2a2a33;
  border-radius: 9px;
  cursor: pointer;
}
.mpop__char:hover {
  border-color: #3a3a46;
}
.mpop__char.is-active {
  border-color: #7c6bff;
  outline: 1px solid #7c6bff;
}
.mpop__toggle {
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #3a3a46;
  border: none;
  position: relative;
  cursor: pointer;
  flex: 0 0 auto;
}
.mpop__toggle.is-on {
  background: #7c6bff;
}
.mpop__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.15s ease;
}
.mpop__toggle.is-on .mpop__knob {
  left: 18px;
}
.mpop__open {
  margin-top: 2px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #3a3a46;
  background: #1b1b23;
  color: #e8e8ed;
  font-size: 12.5px;
  cursor: pointer;
}
.mpop__open:hover {
  border-color: #7c6bff;
  background: #20202a;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (component compiles; not yet rendered).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/overlay/MunuPopup.tsx src/renderer/overlay/overlay.css
git commit -m "feat(overlay): munu quick-settings popup component"
```

---

### Task B7: Click→show+popup, drag-when-pinned, and the move hint

**Files:**
- Modify: `src/renderer/overlay/main.tsx` (state, handlers, render)
- Modify: `src/renderer/overlay/overlay.css` (append hint styles)

- [ ] **Step 1: Add state + settings reads.** In `Overlay()`, add:

```typescript
  const [pinned, setPinned] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const dragRef = useRef<{ sx: number; sy: number; wx: number; wy: number } | null>(null)
  const movedRef = useRef(false)
  const prevPinned = useRef(false)
```

Extend the settings effect (from Task A5) to also track `pinned` and fire the hint on the false→true transition:

```typescript
    void window.dockterm.invoke('settings:get', undefined).then((r) => {
      if (r.ok) {
        setSounds(r.value.munu.sounds)
        setMunuSize(r.value.munu.size)
        setCharacter(r.value.munu.character)
        setPinned(r.value.munu.pinned)
        prevPinned.current = r.value.munu.pinned
      }
    })
    // …app:getInfo unchanged…
    return window.dockterm.on('settings:changed', (s) => {
      setSounds(s.munu.sounds)
      setMunuSize(s.munu.size)
      setCharacter(s.munu.character)
      setPinned(s.munu.pinned)
      if (s.munu.pinned && !prevPinned.current) {
        setShowHint(true)
        setTimeout(() => setShowHint(false), 5000)
      }
      prevPinned.current = s.munu.pinned
    })
```

- [ ] **Step 2: Add the writer helpers + click/drag handlers** inside `Overlay()`:

```typescript
  const writeMunu = (patch: Partial<{ size: number; character: MascotCharacter; pinned: boolean; position: { x: number; y: number } }>): void => {
    void window.dockterm.invoke('settings:set', { munu: { ...patch } } as never)
  }
  const showApp = (): void => {
    void window.dockterm.invoke('munu:showApp', undefined)
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (showCard) return
    movedRef.current = false
    if (!pinned) return // only pinned munu drags
    void window.dockterm.invoke('munu:getBounds', undefined).then((r) => {
      if (r.ok) dragRef.current = { sx: e.screenX, sy: e.screenY, wx: r.value.x, wy: r.value.y }
    })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = dragRef.current
    if (!d) return
    const dx = e.screenX - d.sx
    const dy = e.screenY - d.sy
    if (!movedRef.current && Math.hypot(dx, dy) < 4) return
    movedRef.current = true
    void window.dockterm.invoke('munu:move', { x: d.wx + dx, y: d.wy + dy })
  }
  const onPointerUp = (e: React.PointerEvent): void => {
    const d = dragRef.current
    dragRef.current = null
    if (showCard) return
    if (d && movedRef.current) {
      const dx = e.screenX - d.sx
      const dy = e.screenY - d.sy
      writeMunu({ position: { x: d.wx + dx, y: d.wy + dy } })
      return // a drag, not a click
    }
    // A real click: surface the terminal and toggle the popup.
    showApp()
    setPopupOpen((o) => !o)
  }
```

- [ ] **Step 3: Replace the island element + render the popup and hint.** Update the `.island` wrapper (was lines 203-213) — remove the old `onClick`, add pointer handlers, and render `MunuPopup` + the hint. Import at top: `import { MunuPopup } from './MunuPopup'`.

```tsx
      <div
        ref={islandRef}
        className={`island island--${g.state}${showCard ? ' island--card' : ''}${pinned ? ' island--pinned' : ''}`}
        onMouseEnter={() => setInteractive(true)}
        onMouseLeave={() => setInteractive(false)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title={pinned ? 'munu — drag to move · click for settings' : 'munu'}
      >
        <div className="island__munu">
          {pinned && showHint && (
            <>
              <span className="movehint movehint--l">‹</span>
              <span className="movehint movehint--r">›</span>
              <span className="movehint__tip">drag me anywhere</span>
            </>
          )}
          <Munu
            state={g.state}
            character={character}
            size={showCard ? Math.round(munuSize * 0.75) : munuSize}
          />
        </div>

        {popupOpen && !showCard && (
          <MunuPopup
            size={munuSize}
            character={character}
            pinned={pinned}
            onSize={(n) => writeMunu({ size: n })}
            onCharacter={(c) => writeMunu({ character: c })}
            onPin={(p) => writeMunu({ pinned: p })}
            onOpenApp={() => showApp()}
          />
        )}

        {showCard && primary && (
          /* …existing ask-card JSX unchanged… */
        )}
      </div>
```

Note: the `settings:set` write path persists each change and broadcasts `settings:changed`, which this same overlay listens to — so `munuSize`/`character`/`pinned` update live. `munu:resize` (the existing ResizeObserver effect) grows the window to fit the popup automatically.

- [ ] **Step 4: Append hint styles** to `overlay.css`:

```css
.island__munu {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.movehint {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 22px;
  line-height: 1;
  color: #7c6bff;
  animation: movehint-bob 0.9s ease-in-out infinite;
  pointer-events: none;
}
.movehint--l {
  left: -22px;
}
.movehint--r {
  right: -22px;
  animation-delay: 0.45s;
}
.movehint__tip {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  color: #cfcfd6;
  background: #131319;
  border: 1px solid #2a2a33;
  border-radius: 6px;
  padding: 3px 8px;
  pointer-events: none;
}
@keyframes movehint-bob {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(-3px); }
}
.movehint--r {
  animation-name: movehint-bob-r;
}
@keyframes movehint-bob-r {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .movehint { animation: none; }
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verification (the heart of the feature)**

Run: `npm run dev`. Then:
1. Hover the top-center; munu reveals. **Click it** → DockTerm window comes forward **and** the popup opens. Click again → popup closes.
2. In the popup, press **+/−** → munu resizes live. Click a **character card** → munu changes live (and the Settings panel reflects it).
3. Toggle **Pin to screen** on → munu stays visible (move your cursor away; it doesn't tuck). The **‹ › "drag me anywhere"** hint shows ~5s then fades.
4. **Drag** munu to a new spot. Release. Move the cursor away — it stays where you left it. **Restart the app** → it reappears at that position.
5. Toggle **Pin off** → munu returns to the top-center auto-reveal behavior on next reveal.
6. Open **Settings → munu**: enabling/disabling "Floating overlay" still fully governs the icon (feature stays opt-out).

- [ ] **Step 7: Commit**

```bash
git add src/renderer/overlay/main.tsx src/renderer/overlay/overlay.css
git commit -m "feat(overlay): click→show+popup, pinned drag, and move hint"
```

---

### Task B8: Settings panel — pin parity + polish

**Files:**
- Modify: `src/renderer/src/components/settings/SettingsPanel.tsx` (munu Section)

So the same controls exist in the full Settings panel (user-friendly: everything reachable in one place).

- [ ] **Step 1: Add a Pin field + a reset-position action** to the munu `<Section>` (after the size control):

```tsx
        <Field label="Pin to screen">
          <Toggle checked={s.munu.pinned} onChange={(v) => setMunu({ pinned: v })} />
        </Field>
        {s.munu.pinned && (
          <div className="settings-note">
            munu stays visible and can be dragged anywhere.{' '}
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setMunu({ position: null })}
            >
              Reset position
            </button>
          </div>
        )}
```

(Resetting `position` to `null` makes `placeOverlay` fall back to top-center on the next `repositionOverlay`, which `syncOverlay` triggers on the settings change.)

- [ ] **Step 2: Typecheck + full test run**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Settings → munu: toggle Pin (icon pins/unpins live), "Reset position" re-centers a pinned icon.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/settings/SettingsPanel.tsx
git commit -m "feat(settings): pin toggle + reset-position parity for munu"
```

**✅ Milestone B complete.**

---

## Self-review

**1. Spec coverage**
- "choose the character in settings" → A2 (setting) + A6 (picker UI). ✓
- "very comfort/advanced/aesthetic design" → A6 live-face cards + B6 popup reuse design tokens, tooltips, smooth transitions. ✓
- "click munu → show terminal" → B5 `showMainWindows` + B7 `showApp()` on click. ✓
- "…and show munu's settings popup (size, character, pin)" → B6 `MunuPopup` + B7 toggle on click. ✓
- "pinning → always on screen, not hide" → B3 `wantReveal(pinned)` + B5 poll + B4 placement. ✓
- "after pinning, move it wherever, cool way" → B4 `moveOverlay` + B7 pointer drag + persist. ✓
- "after pinning show ~5s left/right arrows + text that you can move" → B7 `showHint` + `.movehint` (‹ ›) + "drag me anywhere". ✓
- "everything user-friendly / understandable" → labels, `title`/tooltips, hint, Settings parity (B8). ✓
- "default character munu everywhere" → A2 zod `.default('munu')`, A4 prop default, A5 `?? 'munu'`. ✓

**2. Placeholder scan** — no TBD/TODO; every code step is complete. One explicit lookup is flagged honestly (B5 Step 4: match the file's existing `ok`/`err`/void-schema helpers) rather than inventing names — the engineer copies the neighboring handler's convention.

**3. Type consistency** — `MascotCharacter` defined once (A2) and reused in `mascots.ts`, `Munu.tsx`, overlay, popup. Channel names (`munu:showApp` / `munu:getBounds` / `munu:move`) match across ipc.ts (B1) and handlers (B5). `repositionOverlay`/`resizeOverlay` keep their existing exported names (B4) so current callers don't break; `getOverlayBounds`/`moveOverlay` are additive. `artFor(character, state, sleeping)` signature is identical in test (A3) and usage (A4).

**Scope note:** Milestone A and Milestone B are each independently shippable. If you prefer, A can merge first (pure win, low risk) and B follow.

---

## Open question for you (only one)

The plan makes **a single click do both** "show the terminal" and "open the popup" (your words). If you'd rather the click *only* open the popup (and a button inside it — "Open DockTerm" — surfaces the terminal), it's a one-line change in B7 Step 2 (`onPointerUp`): drop the `showApp()` call. Say which you prefer when you review.
