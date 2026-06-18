# nvurd — the cheerful one

A member of the **munu family**: a little DockTerm creature whose face mirrors what
DockTerm is doing. nvurd is the bright, friendly one — a soft rounded terminal-tile
with a **ribbon bow**, **eyelashes**, a touch of **blush**, and **rose** features.

Same dark tile, feet, and 5-state expression system as [munu](../munu) — only the
silhouette, accent, and accessories differ.

## Expressions (face = app state)

| file | state |
|------|-------|
| `nvurd.svg` | **resting** — idle / ready |
| `nvurd-happy.svg` | **happy** — working tree clean |
| `nvurd-working.svg` | **working** — busy / running *(animated)* |
| `nvurd-sleeping.svg` | **sleeping** — paused / no project |
| `nvurd-asking.svg` | **asking** — needs your `[y/n]` *(animated)* |

## Icons & wordmark

| file | use |
|------|-----|
| `nvurd-icon.svg` | launcher / chip (256, fills the tile) |
| `nvurd-icon-16.svg` | favicon-size minimal mark |
| `nvurd-wordmark.svg` | logo lockup — mascot + `nvurd_` *(blinking cursor)* |
| `preview.png` | the whole kit at a glance |

## Palette

```
#e07bc6  accent (rose)            eyes: #f6c2e9 → #e07bc6 → #b8458f
#cf5ca8  bow                      blush: #f29ad6
dark tile + bevel from DockTerm tokens.css (#1f1b24 → #0d0c0f)
```

Hand-generated from `../_gen-mascots.js`. The `working` and `asking` cursors animate
via inline SMIL (fall back to a solid block where SMIL isn't supported).
