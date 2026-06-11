# 07 — UI/UX Design Research Report
**DockTerm** | UI/UX Design Agent | 2026-06-11

---

## Findings

### Visual Language Research

**Warp Terminal** (https://www.warp.dev/) sets the current gold standard for terminal-first design.
Key observations from their 2026 changelog and marketing site:
- Near-black background with no blue-shift; accent is a warm off-white against dark chrome
- "Blocks" model: each command run is a visually bounded unit with exit-code chip and duration
- Vertical tabs introduced 2026 — sidebar navigation, not a tab bar — shows the industry moving away from horizontal tab strips inside terminal apps
- App-level shortcuts are kept at Cmd/Ctrl+Shift layer; raw Ctrl+letter is always forwarded to the PTY
- No dashboard chrome; the command area IS the content area

**Wave Terminal** (https://github.com/wavetermdev/waveterm) is the closest architectural cousin to DockTerm:
- Built with Electron + React/TypeScript + Go backend; uses Monaco for editing
- Block-based modular layout with drag/resize
- 2025 UI refresh removed blue accents in favor of transparent/neutral surfaces
- Ships CodeEdit (Monaco) as a first-class block alongside the terminal block
- Multi-panel approach pushes terminal and editor side-by-side

**Zed Editor** (https://zed.dev/) informs the non-terminal panels:
- Dark-first; charcoal/near-black with white text, blue-600/blue-700 accents
- Left sidebar for project navigation
- Monospace typography throughout (uses Zed Mono)
- Generous whitespace with high information density in the file tree
- Theme system: 16 surface/border color categories + 10 syntax categories

**Linear App** (https://linear.app/) informs the overall product feel:
- 2025 redesign: monochrome black/white with surgical use of one bold color
- No zig-zag content; sequential, unambiguous hierarchy
- Bold typography as a signal, not decoration
- Dark mode is primary, light is derived; 100% pure black is avoided — brand color at 2-5% lightness used for app background
- Panel transitions: no animation theatrics; panels appear/disappear; focus follows action

**Ghostty** (https://ghostty.org/) informs terminal chrome defaults:
- Minimal chrome: font + colors + cursor; zero padding
- Dark aesthetic = translucent surfaces with subtle blur (optional, performant)
- Ships with hundreds of built-in themes; system light/dark auto-switch supported

---

### Library Research

#### Resizable Panels

| Library | Version (Jun 2026) | Weekly DL | Notes |
|---|---|---|---|
| react-resizable-panels | ~4.x (latest) | ~31.6M | Brian Vaughn (React DevTools author); React 18/19; 12 kB gzipped; actively maintained, avg 9-day issue close time |
| allotment | 1.20.5 | ~203K | VS Code-style snap/nested panes; heavier; best for IDE shells |
| split.js | 1.6.5 | ~420K | Framework-agnostic; tiny; no persistence |

Sources: https://www.npmjs.com/package/react-resizable-panels · https://pkgpulse.com/guides/react-resizable-panels-vs-split-js-vs-allotment-2026

**Decision: react-resizable-panels.** Despite allotment's "IDE-grade" marketing, react-resizable-panels has 155x the downloads, active maintenance, a smaller bundle, built-in accessibility (keyboard-resizable separators), and panel-collapse/persistence APIs. At 4.x it has mature nested group support covering every DockTerm split: `[side-dock | [terminal | editor]]` as a nested PanelGroup is trivial.

#### Command Palette

| Library | Status |
|---|---|
| cmdk (pacocoursey) | Actively maintained; requires React 18; unstyled primitives; used by shadcn/ui, Vercel, Linear |
| react-cmdk | Last published 3 years ago — abandoned |
| hand-rolled | Viable; ~100 LOC with fuzzy search via fuse.js |

Sources: https://www.npmjs.com/package/cmdk

**Decision: cmdk.** It is the de-facto standard, unstyled (we supply all CSS), and the 100% styling ownership aligns with our "custom CSS, no heavy framework" goal. The Dialog primitive handles portal/focus-trap correctly.

#### Typography

**Cascadia Mono/Code** ships bundled with Windows Terminal and is included in Windows 11. It does not ship as a system font accessible to web apps but is reliably present for users who have Windows Terminal installed.  
Source: https://learn.microsoft.com/en-us/windows/terminal/cascadia-code · https://github.com/microsoft/cascadia-code

---

### Keyboard Strategy Research

**VS Code approach** (https://code.visualstudio.com/docs/terminal/advanced):
- Three-layer system: `commandsToSkipShell` (hardcoded list), `sendKeybindingsToShell` (override), `allowChords` (chord sequences skip shell by default)
- Design philosophy: explicit allowlist, not implicit guessing
- Cmd/Ctrl+F and similar are VS Code-level; plain Ctrl+letter goes to shell

**Windows Terminal approach** (https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions):
- App-level shortcuts use Ctrl+Shift+<letter> exclusively on Windows/Linux
- Plain Ctrl+letter is ALWAYS forwarded to the shell — no exceptions
- This prevents any conflict with bash readline (Ctrl+R, Ctrl+A, Ctrl+E, Ctrl+C, Ctrl+D, Ctrl+L, Ctrl+U, Ctrl+K, Ctrl+W), tmux (Ctrl+B prefix), and Claude Code's TUI (Ctrl+J, Ctrl+G, Ctrl+R, Ctrl+P, Ctrl+K)

**Warp approach** (https://docs.warp.dev/getting-started/keyboard-shortcuts/):
- macOS: Cmd+<letter> for app actions; Ctrl+letter goes to shell
- The PTY layer never sees Cmd key — it is macOS-exclusive to the GUI layer
- Windows: Ctrl+Shift+<letter> for app actions
- Conflicts are surfaced visually (orange border in settings)

**Conclusion:** The cross-platform safe zone is:
- **macOS**: `Cmd+<letter>` or `Cmd+Shift+<letter>` for DockTerm actions
- **Windows/Linux**: `Ctrl+Shift+<letter>` for DockTerm actions  
- **Never**: plain `Ctrl+<letter>` while the terminal is focused (shell owns all of these)
- **Editor-only**: `Ctrl+S` / `Ctrl+W` only fire when Monaco is focused (not terminal)

---

## Risks

1. **Font availability fallback**: JetBrains Mono requires user installation. Cascadia Mono is bundled with Windows Terminal but not as a OS web font. SF Mono is only available inside Xcode. The fallback chain must be ordered carefully and `monospace` final fallback tested to prevent layout jitter on first load before fonts load.

2. **Keyboard conflict on Windows edge cases**: Some Windows software intercepts `Ctrl+Shift+G` (VS Code source control), `Ctrl+Shift+P` (VS Code command palette). DockTerm should allow user rebinding for all shortcuts. The defaults chosen should avoid collisions with VS Code since many users run both.

3. **cmdk focus management**: When the command palette opens, focus must move entirely out of the terminal PTY or the shell will receive keystrokes. The cmdk Dialog primitive handles this, but xterm.js requires explicit `.blur()` call before opening.

4. **react-resizable-panels keyboard accessibility**: The library renders drag handles that are keyboard-navigable by default (arrow keys resize). This is correct but must be tested with the terminal focused — ensure arrow key presses in the terminal do NOT trigger panel resize.

5. **Monaco + xterm.js color mismatch**: Without a deliberate theme bridge, the terminal colors and editor colors will look like different products. The palette tokens below are specifically designed to share the same hue family so Monaco's syntax colors and xterm ANSI colors are recognizably siblings.

6. **Panel push vs overlay performance**: Push-with-resize causes the terminal's xterm.js canvas to resize on every drag frame. xterm.js handles this well via its `fit` addon but must be called on panel resize events. Skipping this causes misaligned cursor position.

---

## Decisions (Recommended)

### D1 — Terminal is the Hero, Panels Push (Not Overlay)
**Decision: Push with resizable split.**  
Overlay (drawer-style) panels feel like an afterthought and obscure terminal content. Push-with-resizable-split keeps the terminal always visible in its column, shrinking to make room — this is the model used by VS Code, Zed, and Wave Terminal. Users can drag the divider to give terminal more space or collapse panels entirely. The terminal never disappears; it just narrows.

Justification: DockTerm's identity is "terminal as hero." A panel overlaying the terminal contradicts this. Users who want terminal-only get there by dragging the divider to collapse the dock. Panel state (widths, open/closed) is persisted via `react-resizable-panels` built-in storage API.

### D2 — Side Dock: LEFT
**Decision: Left dock.**  
Left dock matches: VS Code, Zed, Wave Terminal, WebStorm, all major developer tools. Users have built 20+ years of muscle memory for left-panel navigation. A right dock would require a strong justification (e.g., the app is reading-direction-agnostic) — none exists here. The file tree, git panel, and all dock icons sit on the left rail.

### D3 — Editor Split: Right of Terminal
**Decision: Editor opens to the RIGHT of the terminal in a horizontal split.**  
Layout: `[left-dock (collapsible)] | [terminal] | [editor (collapsible)]`.  
This matches Wave Terminal's approach. The terminal stays in the center/left of the working area and the editor extends rightward. This prevents the terminal from being pushed to a marginal column, which would be visually demoting. Users who open the editor see a 50/50 or 40/60 (terminal/editor) split by default; draggable.

### D4 — Resizable Panels Library: react-resizable-panels
**Decision:** See Library Research above.

### D5 — Command Palette: cmdk
**Decision:** See Library Research above.

### D6 — Keyboard Strategy: Modifier-Based Isolation
**Decision:** macOS uses Cmd+letter; Windows/Linux uses Ctrl+Shift+letter. No plain Ctrl+letter DockTerm shortcuts exist. Editor-only shortcuts (save, close tab) gate on Monaco focus state. Full shortcut table in V1 Recommendations.

---

## Rejected Ideas

### Overlay/Drawer Panels
**Rejected.** Drawers feel modal — they demand user attention and cover the terminal content. DockTerm's philosophy is "panels appear only when needed" but they should not erase the terminal. Push-with-resize achieves the goal without occlusion.

### Right Dock
**Rejected.** Against 20+ years of developer convention. No unique benefit.

### Editor Replaces Terminal (Single-pane swap)
**Rejected.** Forcing users to choose "terminal or editor" violates the core value prop of DockTerm which is both simultaneously. This was the pre-Wave approach and users hated it.

### Heavy UI Framework (Radix full suite, Chakra, MUI)
**Rejected.** Per spec: custom CSS, no heavy framework. Components are hand-rolled using cmdk for the palette, lucide-react for icons, react-resizable-panels for splits, and plain CSS for everything else.

### Light Mode in V1
**Rejected.** Dark-only V1 is correct. Building light mode requires a complete second token set and testing; deferring this avoids shipping a half-finished light theme that embarrasses the product.

### react-cmdk (albingroen)
**Rejected.** Abandoned — last published 3 years ago.

### Allotment
**Rejected in favor of react-resizable-panels.** Despite IDE-native positioning, its 155x smaller download count indicates lower ecosystem confidence, and react-resizable-panels has all required features at smaller bundle size.

### Tours / Onboarding Modals
**Rejected per spec.** No walkthroughs. One dismissible hint post-open-project. First launch = hero "Open a project" state.

---

## V1 Recommendations

### 1. Layout Specification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (32px)                                                              │
│ [◆ DockTerm] [Project Name] [⎇ branch-name] [●2 M] [status chip] [icons…] │
└─────────────────────────────────────────────────────────────────────────────┘
┌──────┬──────────────────────────────────┬──────────────────────────────────┐
│ DOCK │         TERMINAL (hero)          │     EDITOR (Monaco, optional)    │
│ LEFT │                                  │                                  │
│ RAIL │  xterm.js full height            │  Monaco editor                   │
│ 48px │  font: mono stack                │  same theme as terminal          │
│      │  padding: 0                       │  tabs on top edge                │
│ ─────│  cursor blinks                   │                                  │
│ icon │  NO border / chrome              │  [untitled.ts ×] [index.ts]      │
│ icon │                                  │                                  │
│ icon │                                  │                                  │
│ icon │                                  │                                  │
│      │                                  │                                  │
│ icon │  SIDE PANEL (when open, 260px    │                                  │
│ at   │  default, draggable, replaces    │                                  │
│ bot  │  no space — pushes terminal      │                                  │
│      │  right)                          │                                  │
└──────┴──────────────────────────────────┴──────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│ BOTTOM MINI-TERMINAL (optional, 140px, collapsible)                         │
│ Read-only output stream / secondary command area                            │
└─────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│ STATUS STRIP (20px) — exit code · cwd · model · MCP count · key hints      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Top bar height:** 32px  
**Left rail (icon dock):** 48px wide — icons only, no labels  
**Side panel (when open):** 260px default, min 180px, max 480px  
**Terminal:** fills remaining horizontal space; always visible  
**Editor panel (when open):** 50% of (viewport − dock − side panel) by default  
**Bottom mini-terminal:** 140px tall, min 80px  
**Status strip:** 20px  

**PanelGroup nesting:**
```
<PanelGroup direction="horizontal">
  <Panel id="side-panel" defaultSize={20} collapsible minSize={14} />
  <PanelResizeHandle />
  <Panel id="main-work-area">
    <PanelGroup direction="horizontal">
      <Panel id="terminal" defaultSize={55} minSize={30} />
      <PanelResizeHandle />
      <Panel id="editor" defaultSize={45} collapsible minSize={25} />
    </PanelGroup>
  </Panel>
</PanelGroup>
```

The vertical axis:
```
<PanelGroup direction="vertical">
  <Panel id="top-work" defaultSize={82} />
  <PanelResizeHandle />
  <Panel id="mini-terminal" defaultSize={18} collapsible minSize={8} />
</PanelGroup>
```

---

### 2. Dark Theme Tokens (CSS Custom Properties)

```css
:root {
  /* ── Backgrounds (layered) ── */
  --color-bg-app:          #0d0d0f;   /* near-black; app shell */
  --color-bg-panel:        #131316;   /* side panels, tree */
  --color-bg-raised:       #1a1a1f;   /* cards, dropdowns, tooltips */
  --color-bg-input:        #1f1f26;   /* input fields, search bars */
  --color-bg-hover:        #232329;   /* list row hover */
  --color-bg-selected:     #2a2a35;   /* list row selected */

  /* ── Text tiers ── */
  --color-text-primary:    #e8e8f0;   /* body text, file names */
  --color-text-secondary:  #9090a8;   /* labels, meta, branch names */
  --color-text-muted:      #55556a;   /* placeholders, disabled, hints */

  /* ── Borders ── */
  --color-border-subtle:   #222230;   /* panel dividers, card edges */
  --color-border-default:  #2e2e40;   /* input outlines, separators */
  --color-border-strong:   #44445a;   /* focused elements before ring */

  /* ── Accent (violet-indigo) ── */
  --color-accent:          #7c6bff;   /* primary buttons, active tab, focus ring */
  --color-accent-hover:    #9080ff;   /* accent hover */
  --color-accent-subtle:   #2a2550;   /* accent-tinted bg (active dock icon) */
  --color-accent-text:     #b8aefd;   /* accent in text contexts */

  /* ── Semantic colors (muted, not garish) ── */
  --color-success:         #3dba7a;   /* added files, clean git, ok status */
  --color-success-subtle:  #1a3328;
  --color-warning:         #e8a246;   /* modified M badge, dirty count */
  --color-warning-subtle:  #332614;
  --color-danger:          #e05c5c;   /* deleted D, error, destructive btn */
  --color-danger-subtle:   #331616;
  --color-info:            #5c9fe0;   /* untracked U badge, info toast */
  --color-info-subtle:     #132238;

  /* ── Focus ring ── */
  --color-focus-ring:      #7c6bff66; /* 40% opacity accent */

  /* ── Terminal surface ── */
  --color-terminal-bg:     #0d0d0f;   /* matches app bg — terminal is app */
  --color-terminal-fg:     #d4d4e0;

  /* ── Scrollbars ── */
  --color-scrollbar-track: transparent;
  --color-scrollbar-thumb: #2e2e40;
  --color-scrollbar-hover: #44445a;
}
```

**Accent system note:** The accent is user-swappable via a `--color-accent` override (settings panel emits a `<style>` tag). The derived tokens (`--color-accent-hover`, `--color-accent-subtle`, `--color-accent-text`) must also update. In V1 ship three presets: Violet (default), Blue (#4d8ef0), Teal (#3dbab4).

---

### 3. xterm.js ANSI 16-Color Theme

Matching the CSS palette above, shared hue family — terminal and UI feel like one product.

```ts
// xterm.js ITheme object
export const docktermXtermTheme = {
  background:                '#0d0d0f',  // --color-bg-app
  foreground:                '#d4d4e0',  // --color-terminal-fg
  cursor:                    '#7c6bff',  // --color-accent
  cursorAccent:              '#0d0d0f',
  selectionBackground:       '#7c6bff44',
  selectionForeground:       undefined,  // inherit
  selectionInactiveBackground: '#44445a55',

  // Standard ANSI (0-7)
  black:                     '#1a1a1f',  // not pure black — avoids invisible on bg
  red:                       '#e05c5c',  // --color-danger
  green:                     '#3dba7a',  // --color-success
  yellow:                    '#e8a246',  // --color-warning
  blue:                      '#5c9fe0',  // --color-info
  magenta:                   '#b06fd8',  // purple
  cyan:                      '#3dbab4',  // teal
  white:                     '#9090a8',  // --color-text-secondary

  // Bright ANSI (8-15)
  brightBlack:               '#44445a',  // --color-border-strong
  brightRed:                 '#f08080',
  brightGreen:               '#6ecf96',
  brightYellow:              '#f5bc75',
  brightBlue:                '#80baff',
  brightMagenta:             '#c890e8',
  brightCyan:                '#5dd4ce',
  brightWhite:               '#e8e8f0',  // --color-text-primary
};
```

---

### 4. Monaco Editor Theme

```ts
// monaco.editor.defineTheme('dockterm-dark', docktermMonacoTheme)
export const docktermMonacoTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment',          foreground: '55556a', fontStyle: 'italic' },
    { token: 'keyword',          foreground: '7c6bff' },  // accent
    { token: 'string',           foreground: '3dba7a' },  // success-green
    { token: 'number',           foreground: 'e8a246' },  // warning-amber
    { token: 'type',             foreground: '5c9fe0' },  // info-blue
    { token: 'function',         foreground: 'b8aefd' },  // accent-text
    { token: 'variable',         foreground: 'd4d4e0' },  // terminal fg
    { token: 'operator',         foreground: '9090a8' },
    { token: 'delimiter',        foreground: '9090a8' },
    { token: 'tag',              foreground: 'e05c5c' },  // danger-red
    { token: 'attribute.name',   foreground: '5c9fe0' },
    { token: 'attribute.value',  foreground: '3dba7a' },
  ],
  colors: {
    'editor.background':              '#0d0d0f',  // matches terminal bg
    'editor.foreground':              '#d4d4e0',
    'editor.lineHighlightBackground': '#131316',
    'editor.selectionBackground':     '#7c6bff44',
    'editor.inactiveSelectionBackground': '#44445a33',
    'editorCursor.foreground':        '#7c6bff',
    'editorLineNumber.foreground':    '#44445a',
    'editorLineNumber.activeForeground': '#9090a8',
    'editorIndentGuide.background':   '#222230',
    'editorIndentGuide.activeBackground': '#2e2e40',
    'editorGutter.background':        '#0d0d0f',
    'editorWidget.background':        '#1a1a1f',
    'editorWidget.border':            '#2e2e40',
    'editorSuggestWidget.background': '#1a1a1f',
    'editorSuggestWidget.border':     '#2e2e40',
    'editorSuggestWidget.selectedBackground': '#2a2a35',
    'scrollbarSlider.background':     '#2e2e4066',
    'scrollbarSlider.hoverBackground': '#44445a88',
    'tab.activeBackground':           '#131316',
    'tab.inactiveBackground':         '#0d0d0f',
    'tab.border':                     '#222230',
    'tab.activeBorderTop':            '#7c6bff',
    'editorGroupHeader.tabsBackground': '#0d0d0f',
    'titleBar.activeBackground':      '#0d0d0f',
    'statusBar.background':           '#0d0d0f',
    'panel.background':               '#0d0d0f',
    'sideBar.background':             '#131316',
    'sideBar.border':                 '#222230',
    'list.hoverBackground':           '#232329',
    'list.activeSelectionBackground': '#2a2a35',
    'focusBorder':                    '#7c6bff',
    'input.background':               '#1f1f26',
    'input.border':                   '#2e2e40',
    'input.foreground':               '#e8e8f0',
    'inputOption.activeBorder':       '#7c6bff',
  },
};
```

---

### 5. Typography & Iconography

**UI Font Stack (system):**
```css
--font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI',
           system-ui, sans-serif;
```
Rationale: `Segoe UI Variable` is the Windows 11 variable font with excellent legibility at small sizes. `-apple-system` picks San Francisco on macOS. No web font download required — zero FOIT.

**Monospace Stack (terminal + editor):**
```css
--font-mono: 'JetBrains Mono', 'Cascadia Mono', 'Cascadia Code', 'SF Mono',
             'Menlo', 'Consolas', monospace;
```
- JetBrains Mono: user-installed (most Claude Code users have it); 2px extra legibility at 13px
- Cascadia Mono: ships with Windows Terminal on Windows 11; no ligatures variant chosen over Cascadia Code by default (less visual noise in terminal)
- SF Mono: macOS, available when Xcode is installed  
- Menlo: macOS system monospace fallback
- Consolas: Windows built-in

**Type Scale:**

| Purpose | Size | Weight | Line-height |
|---|---|---|---|
| Top bar text | 12px | 500 | 1.0 |
| Panel section header | 11px | 600 (all-caps) | 1.0 |
| List row primary | 13px | 400 | 1.4 |
| List row meta | 11px | 400 | 1.3 |
| Badge / chip | 11px | 500 | 1.0 |
| Terminal font | 13px | 400 | var(xterm) |
| Editor font | 13px | 400 | 1.5 |
| Command palette input | 14px | 400 | 1.0 |
| Tooltip | 11px | 400 | 1.3 |
| Empty state heading | 14px | 500 | 1.4 |
| Empty state body | 12px | 400 | 1.5 |

**Lucide Icons:**

| Context | Size | Stroke |
|---|---|---|
| Dock rail (primary nav) | 18px | 1.5 |
| Panel header actions | 14px | 1.5 |
| List row glyphs | 14px | 1.5 |
| Top bar controls | 14px | 1.5 |
| Badge adjacent | 12px | 2.0 |
| Empty state hero | 32px | 1.0 |

Global default via CSS:
```css
.lucide { stroke-width: 1.5; }
```
Note: use `absoluteStrokeWidth` prop when icons are rendered at non-24px sizes to keep stroke visually consistent.

---

### 6. Component Inventory

#### Buttons

```css
/* Primary button */
.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border-radius: 5px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
}
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-primary:focus-visible { outline: 2px solid var(--color-focus-ring); }

/* Ghost button */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 5px;
  padding: 3px 10px;
  font-size: 12px;
}
.btn-ghost:hover { color: var(--color-text-primary); background: var(--color-bg-hover); }

/* Danger button */
.btn-danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: 5px;
  padding: 4px 12px;
  font-size: 12px;
}
.btn-danger:hover { background: var(--color-danger); color: #fff; }
```

#### List Rows
- Height: 28px
- Padding: 0 8px
- Icon at 14px + 6px gap + label text-primary 13px + right-slot (badge or action icon)
- Hover: `--color-bg-hover`
- Selected: `--color-bg-selected` + left border 2px accent
- Keyboard navigable; focus ring on `:focus-visible`

#### Tabs (Editor)
- Top-edge active indicator: 2px border-top accent
- Active tab: `--color-bg-panel`; inactive: `--color-bg-app`
- Height: 32px
- Close button `×` at 14px appears on hover; always visible if tab is active
- Modified indicator: `●` in `--color-warning` before filename
- Max visible tabs: virtualize with overflow scroll (no dropdown)

#### Badges (Git Status)

| Badge | Text | Color |
|---|---|---|
| M | Modified | `--color-warning` (#e8a246) |
| A | Added | `--color-success` (#3dba7a) |
| D | Deleted | `--color-danger` (#e05c5c) |
| U | Untracked | `--color-info` (#5c9fe0) |
| R | Renamed | `--color-warning` |
| C | Conflict | `#b06fd8` (magenta) |

Badges are 16px × 16px rounded squares, font 10px weight 600.

#### Modal (Commit, Confirmations)
- Backdrop: `rgba(0,0,0,0.65)` with no blur (blur has GPU cost on lower-end Windows machines)
- Panel: `--color-bg-raised` (#1a1a1f), border `--color-border-default`, border-radius 8px
- Width: 480px max; padding 20px
- Header: title 14px/500 + optional icon; close `×` top-right
- Footer: right-aligned action buttons with 8px gap
- Focus lock via cmdk Dialog primitive or `focus-trap-react`
- Close: Escape key, backdrop click, explicit cancel

#### Toast
- Position: bottom-right, 16px margin
- Width: 320px max
- Background: `--color-bg-raised` + left border 3px semantic color
- Auto-dismiss: 4 seconds; progress bar at bottom optional
- Types: success (green border), warning (amber), error (red), info (blue)
- Stack up to 3; oldest auto-dismiss first

#### Tooltip
- Background: `--color-bg-raised`
- Border: 1px `--color-border-default`
- Font: 11px, `--color-text-secondary`
- Max-width: 240px
- Delay appear: 400ms; dismiss: immediate
- `role="tooltip"` + aria-describedby wired

#### Command Palette (cmdk)
- Rendered as cmdk `<Command>` inside `<Dialog>`
- Input: 16px, `--color-bg-input`, 1px border accent on focus
- Results list: max-height 400px scroll
- Group headers: 10px all-caps, `--color-text-muted`
- Shortcut hint right-aligned: `kbd` elements, `--color-bg-hover`, rounded 3px
- Empty state inline (not full panel): "No results" in muted text
- Fuzzy match: cmdk's built-in filter (suffix scoring); no additional library needed

#### Empty States

**No project open:**
> "No project open"  
> Drop a folder here or use **⌘O / Ctrl+Shift+O** to open one.  
> *(folder-open icon at 32px)*

**File tree — nothing to show (empty dir):**
> "This folder is empty."

**Git panel — clean working tree:**
> "Nothing to commit"  
> Your working tree is clean. All changes have been staged and committed.  
> *(git-check icon)*

**Git panel — not a git repo:**
> "Not a git repository"  
> Run `git init` in the terminal to start tracking this project.

**Review/Diff — no changes staged:**
> "No staged changes"  
> Stage files from the Git panel to see a diff here.

**MCP Servers — none configured:**
> "No MCP servers"  
> Add servers in **Settings → MCP** or drop a `claude_desktop_config.json` here.  
> *(server icon)*

**Skills — none found:**
> "No skills detected"  
> Skills live in `~/.claude/plugins/`. Install a plugin or run `/skills` in the terminal.  
> *(puzzle-piece icon)*

**Bottom mini-terminal — idle:**
> *(empty; just the prompt blinks — no copy)*

#### Loading Pattern
- Skeleton rows: `--color-bg-hover` with shimmer animation (CSS only, `@keyframes shimmer`)
- Inline spinner: 14px Lucide `<Loader2>` with `animate-spin`; avoid full-panel spinners
- Never block the terminal with a loading state

#### Error Pattern
- Inline inline: red left-border row with Lucide `<AlertTriangle>` 14px + error text in `--color-danger`
- Critical (panel failed to load): empty state variant with red icon + retry button

---

### 7. Keyboard Shortcut Strategy

**Core principle**: DockTerm shortcuts live in a modifier layer that the PTY never sees.
- macOS: `Cmd` key is GUI-only — PTY cannot intercept it. All DockTerm panel toggles use `Cmd+letter`.
- Windows/Linux: `Ctrl+Shift+letter` is the Windows Terminal convention and is safe because shells only listen on plain `Ctrl+letter`.
- Editor-focused shortcuts (`Save`, `Close Tab`) are scoped: they only fire when Monaco reports focus, never when xterm.js is focused.

**Implementation**: An `e.preventDefault()` keybinding layer wraps the app root. Each shortcut handler checks `document.activeElement` or a React context `focusedPane` value before acting. When terminal is focused, only the modifier-layer shortcuts are caught; all other `keydown` events are allowed to flow to xterm.js.

**Full Shortcut Table:**

| Action | macOS | Windows/Linux | Notes |
|---|---|---|---|
| Toggle File Tree | `Cmd+B` | `Ctrl+Shift+B` | B = "Browse" |
| Toggle Git Panel | `Cmd+G` | `Ctrl+Shift+G` | G = "Git" |
| Toggle Review/Diff | `Cmd+R` | `Ctrl+Shift+R` | R = "Review" |
| Toggle MCP Servers | `Cmd+M` | `Ctrl+Shift+M` | M = "MCP" |
| Toggle Skills | `Cmd+K` | `Ctrl+Shift+K` | K = "sKills" |
| Toggle Mini-Terminal | `Cmd+J` | `Ctrl+Shift+J` | J = bottom (↓) |
| Open Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` | matches VS Code muscle memory |
| Open Project | `Cmd+O` | `Ctrl+Shift+O` | O = "Open" |
| Focus Terminal | `Cmd+1` | `Ctrl+Shift+1` | |
| Focus Editor | `Cmd+2` | `Ctrl+Shift+2` | |
| Open Settings | `Cmd+,` | `Ctrl+Shift+,` | macOS convention |
| Save (editor only) | `Cmd+S` | `Ctrl+S` | **Editor-focused only**; not captured when terminal active |
| Close Editor Tab | `Cmd+W` | `Ctrl+W` | **Editor-focused only** |
| New Editor Tab | `Cmd+T` | `Ctrl+T` | **Editor-focused only** |
| Next Editor Tab | `Cmd+]` | `Ctrl+Shift+]` | |
| Prev Editor Tab | `Cmd+[` | `Ctrl+Shift+[` | |
| Commit (in modal) | `Cmd+Enter` | `Ctrl+Enter` | fires in commit modal only |
| Clear Terminal | `Cmd+L` | none | shell `clear` preferred; Ctrl+L goes to shell |
| Dismiss/Close Panel | `Escape` | `Escape` | when panel has focus |

**Conflicts deliberately avoided:**
- `Ctrl+R` — bash reverse history search (never mapped)
- `Ctrl+A`, `Ctrl+E` — readline begin/end of line
- `Ctrl+C`, `Ctrl+D` — interrupt / EOF
- `Ctrl+L` — shell clear (Cmd+L is macOS DockTerm only)
- `Ctrl+B` — tmux prefix (never mapped on Windows/Linux)
- `Ctrl+P`, `Ctrl+N` — readline history prev/next
- `Ctrl+G`, `Ctrl+J`, `Ctrl+K` — Claude Code TUI shortcuts

**`Ctrl+Shift+G` collision note:** This is VS Code's Source Control toggle. Users who run VS Code and DockTerm side-by-side may find muscle memory conflict. The settings panel should surface rebinding for the Git panel shortcut specifically. Default ships with `Ctrl+Shift+G` since DockTerm is standalone, not an extension.

---

### 8. ASCII Wireframes

#### A — Default Screen (Terminal Only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready    [⌘B] [⌘G] [⌘R] [⌘M] [⌘K]  ⚙  │
├──┬──────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│⎕ │  ~/projects/my-project                                                  │
│  │  $ claude                                                                │
│⎇ │  ╭─ Claude Code v1.x ─────────────────────────────────────────────────╮ │
│  │  │  > |                                                                │ │
│⊞ │  ╰───────────────────────────────────────────────────────────────────╯ │
│  │                                                                          │
│⚙ │                                                                          │
│  │                                                                          │
├──┴──────────────────────────────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:3  ⌘Shift+P palette  │
└─────────────────────────────────────────────────────────────────────────────┘
```

Left rail icons (top→bottom): `⎕` Files, `⎇` Git, `⊞` Review, `●` MCP, `◈` Skills | `⚙` Settings (bottom-pinned)  
All icons: 18px, inactive = `--color-text-muted`, hover = `--color-text-secondary`, active = `--color-accent`

---

#### B — Files + Editor Open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready    [⌘B] [⌘G] [⌘R] [⌘M] [⌘K]  ⚙  │
├──┬──────────────────────┬────────────────────┬───────────────────────────────┤
│  │ FILES                │                    │  [index.ts] [● app.ts ×]     │
│⎕ │ ▼ src               │  $ claude          │  ──────────────────────────  │
│  │   ▶ components      │  > Editing         │  import { useState }          │
│⎇ │   ▶ hooks           │    index.ts...     │  from 'react'                │
│  │   ▶ styles          │                    │                              │
│⊞ │   ▼ pages           │  ╭──────────────╮  │  export default function      │
│  │     index.ts  M     │  │ > |          │  │  App() {                     │
│⚙ │     app.ts    A     │  ╰──────────────╯  │    const [count, set         │
│  │ ▶ public            │                    │    Count] = useState(0)      │
│  │ package.json        │                    │                              │
│  │ tsconfig.json       │                    │                              │
│  │                     │                    │                              │
├──┴──────────┬───────────┴────────────────────┴───────────────────────────────┤
│    ◂▸       │ exit:0  ~/projects  claude-sonnet-4-5  MCP:3                   │
└─────────────┴─────────────────────────────────────────────────────────────────┘
     260px          ~38% wide               ~remaining
     (draggable)    terminal               editor
```

---

#### C — Git Panel Open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬──────────────────────┬──────────────────────────────────────────────────┤
│  │ GIT                  │                                                  │
│⎕ │ ⎇ main              │  $ claude                                        │
│  │                      │  > |                                             │
│⎇ │ STAGED (1)           │                                                  │
│◀ │   A  src/app.ts      │                                                  │
│  │                      │                                                  │
│⊞ │ CHANGES (2)          │                                                  │
│  │   M  src/index.ts    │                                                  │
│⚙ │   M  package.json   │                                                  │
│  │                      │                                                  │
│  │ ─────────────────    │                                                  │
│  │ Commit message       │                                                  │
│  │ ┌────────────────┐   │                                                  │
│  │ │                │   │                                                  │
│  │ └────────────────┘   │                                                  │
│  │ [Stage All]  [Commit] │                                                  │
├──┴──────────────────────┴──────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:3                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### D — Review/Diff Panel Open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬──────────────────────────────────┬────────────────────────────────────────┤
│  │ REVIEW  src/index.ts   M        │                                        │
│⎕ │ ─────────────────────────────── │  $ claude                              │
│  │  14 │-  const old = 'value'     │  > Reviewing diff...                   │
│⎇ │     │+  const newVal = 'val'    │                                        │
│  │  15 │   // unchanged line       │                                        │
│⊞ │  16 │+  return newVal           │                                        │
│◀ │     │-  return old              │                                        │
│  │  17 │   }                       │                                        │
│⚙ │                                 │                                        │
│  │ [← Prev Hunk]    [Next Hunk →]  │                                        │
│  │ [Stage Hunk]                    │                                        │
├──┴──────────────────────────────────┴──────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:3                    │
└─────────────────────────────────────────────────────────────────────────────┘
```
`-` lines: danger-subtle bg + danger text; `+` lines: success-subtle bg + success text

---

#### E — MCP Servers Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬──────────────────────┬──────────────────────────────────────────────────┤
│  │ MCP SERVERS          │                                                  │
│⎕ │                      │  $ claude                                        │
│  │ ● filesystem         │  > |                                             │
│⎇ │   stdio  running     │                                                  │
│  │   14 tools           │                                                  │
│⊞ │                      │                                                  │
│  │ ● github             │                                                  │
│● │   stdio  running     │                                                  │
│◀ │   22 tools           │                                                  │
│  │                      │                                                  │
│⚙ │ ⊘ postgres           │                                                  │
│  │   sse  stopped       │                                                  │
│  │   [Reconnect]        │                                                  │
│  │                      │                                                  │
│  │ [+ Add Server]       │                                                  │
├──┴──────────────────────┴──────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:2/3                  │
└─────────────────────────────────────────────────────────────────────────────┘
```
Status dots: ● green = running, ⊘ red = stopped/error, ○ gray = disabled

---

#### F — Skills Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬──────────────────────┬──────────────────────────────────────────────────┤
│  │ SKILLS               │                                                  │
│⎕ │ ┌──────────────────┐ │  $ claude                                        │
│  │ │ 🔍 filter...     │ │  > |                                             │
│⎇ │ └──────────────────┘ │                                                  │
│  │                      │                                                  │
│⊞ │ superpowers (12)     │                                                  │
│  │   brainstorming      │                                                  │
│⚙ │   debugging          │                                                  │
│◈ │   tdd                │                                                  │
│◀ │   writing-plans      │                                                  │
│  │   …8 more            │                                                  │
│  │                      │                                                  │
│  │ frontend-design (1)  │                                                  │
│  │   frontend-design    │                                                  │
│  │                      │                                                  │
│  │ [Open Skills Folder] │                                                  │
├──┴──────────────────────┴──────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  Skills:13                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### G — Command Palette Overlay

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬───────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│⎕ │         ┌──────────────────────────────────────────────────┐            │
│  │         │ 🔍 Type a command or search files…               │            │
│⎇ │         ├──────────────────────────────────────────────────┤            │
│  │         │ RECENT                                           │            │
│⊞ │         │  ⎇  Open Git Panel               ⌘G             │            │
│  │         │  ⎕  Open Files                   ⌘B             │            │
│⚙ │         │  ⚙  Open Settings                ⌘,             │            │
│  │         │                                                  │            │
│  │         │ ACTIONS                                          │            │
│  │         │  ◆  Open Project                  ⌘O             │            │
│  │         │  ●  Commit staged changes                        │            │
│  │         │  ⊞  Toggle Review Panel           ⌘R             │            │
│  │         │  ⋮  (more results…)               ↑↓ navigate   │            │
│  │         └──────────────────────────────────────────────────┘            │
│  │         Esc to close                                                    │
├──┴───────────────────────────────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:3                    │
└─────────────────────────────────────────────────────────────────────────────┘
```
Backdrop: `rgba(0,0,0,0.65)`. Palette panel: 560px wide, centered, top 20% of screen.

---

#### H — Settings Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  my-project    ⎇ main  ●3 M   ● ready                                   │
├──┬──────────────────────┬──────────────────────────────────────────────────┤
│  │ SETTINGS             │  APPEARANCE                                      │
│⎕ │                      │                                                  │
│  │ Appearance   ◀       │  Accent Color                                    │
│⎇ │ Terminal             │  ● Violet  ○ Blue  ○ Teal  ○ Custom             │
│  │ Editor               │                                                  │
│⊞ │ Keyboard             │  Font Size                                       │
│  │ MCP                  │  Terminal: [13px ▾]   Editor: [13px ▾]          │
│⚙ │ Extensions           │                                                  │
│◀ │                      │  Mono Font                                       │
│  │                      │  [JetBrains Mono                     ▾]          │
│  │                      │                                                  │
│  │                      │  Panel Layout                                    │
│  │                      │  Terminal position: [Left ▾] [Right ▾]           │
│  │                      │                                                  │
│  │                      │  Status Strip                                    │
│  │                      │  ☑ Show exit code   ☑ Show model   ☑ Show MCP   │
├──┴──────────────────────┴──────────────────────────────────────────────────┤
│ exit:0  ~/projects/my-project  claude-sonnet-4-5  MCP:3                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 9. Onboarding & Empty State Flow

#### First Launch (No Project)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◆  DockTerm                                                             ⚙  │
├──┬──────────────────────────────────────────────────────────────────────────┤
│  │                                                                          │
│⎕ │                                                                          │
│  │                          ◆ DockTerm                                     │
│⎇ │                     Terminal for Claude Code                            │
│  │                                                                          │
│⊞ │                    ┌─────────────────────────┐                          │
│  │                    │   Open a project          │                         │
│● │                    │   ⌘O / Ctrl+Shift+O       │                         │
│  │                    └─────────────────────────┘                          │
│⚙ │                                                                          │
│  │                    or drop a folder anywhere                             │
│  │                                                                          │
├──┴──────────────────────────────────────────────────────────────────────────┤
│ DockTerm v0.1.0                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

No tour. No "get started" wizard. One CTA, one keyboard shortcut. Drop target is the full window.

#### After First Project Open (One Hint, Dismissible)

After a project opens, the terminal launches in the opened directory. A single floating hint appears at the bottom of the terminal:

```
╭──────────────────────────────────────────────────── ×  ╮
│  Run `claude` here — DockTerm tracks what changes.     │
╰─────────────────────────────────────────────────────────╯
```

- `×` dismisses permanently (localStorage `dockterm.hintDismissed = true`)
- Appears only once; no more hints, no tooltips-on-hover teaching
- Auto-dismiss after 8 seconds if user starts typing

That's it. No modals on start. No confetti.

---

## Sources

- [react-resizable-panels on npm](https://www.npmjs.com/package/react-resizable-panels)
- [react-resizable-panels vs split.js vs Allotment 2026 — PkgPulse](https://pkgpulse.com/guides/react-resizable-panels-vs-split-js-vs-allotment-2026)
- [cmdk on npm](https://www.npmjs.com/package/cmdk)
- [Warp Terminal — The Agentic Development Environment](https://www.warp.dev/)
- [Warp Changelog 2026](https://docs.warp.dev/changelog/2026/)
- [Warp Keyboard Shortcuts](https://docs.warp.dev/getting-started/keyboard-shortcuts/)
- [Warp: Why is terminal input so weird?](https://www.warp.dev/blog/why-is-the-terminal-input-so-weird)
- [Wave Terminal — GitHub](https://github.com/wavetermdev/waveterm)
- [Wave Terminal Docs](https://docs.waveterm.dev/)
- [Wave Terminal: Open-Source Terminal with Modern Visual Tools](https://www.blog.brightcoding.dev/2025/09/13/wave-terminal-the-open-source-terminal-that-blends-command-line-power-with-modern-visual-tools)
- [Zed Editor — zed.dev](https://zed.dev/)
- [Zed Theme System — DeepWiki](https://deepwiki.com/zed-industries/zed/10.4-theme-system)
- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Design: SaaS trend — LogRocket](https://blog.logrocket.com/ux-design/linear-design/)
- [Ghostty Terminal](https://ghostty.org/)
- [Cascadia Code — Microsoft GitHub](https://github.com/microsoft/cascadia-code)
- [Cascadia Code — Windows Terminal Docs](https://learn.microsoft.com/en-us/windows/terminal/cascadia-code)
- [VS Code Terminal Advanced — sendKeybindingsToShell, allowChords](https://code.visualstudio.com/docs/terminal/advanced)
- [Windows Terminal Custom Actions/Keybindings](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions)
- [xterm.js ITheme Interface](https://xtermjs.org/docs/api/terminal/interfaces/itheme/)
- [Setting Colors in xterm.js — Oliver Roick (2024)](https://oliverroick.net/learnings/2024/setting-colours-in-xterm-js.html)
- [Lucide React Sizing](https://lucide.dev/guide/react/basics/sizing)
- [Lucide React Stroke Width](https://lucide.dev/guide/react/basics/stroke-width)
- [UX/UI Design Trends 2026 — Envato](https://elements.envato.com/learn/ux-ui-design-trends)
