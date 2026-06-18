# guru — the wise one

A member of the **munu family**: a little DockTerm creature whose face mirrors what
DockTerm is doing. guru is the cool, smart ~30 mentor — a terminal-tile with a
**man-bun** (with a green hair-tie), **sleek glasses**, a groomed **beard + 'stache**,
a confident raised brow and a **green** smirk. Zen dev-guru energy.

Same dark tile, feet, and 5-state expression system as [munu](../munu) — only the
silhouette, accent, and accessories differ.

## Expressions (face = app state)

| file | state |
|------|-------|
| `guru.svg` | **resting** — idle / ready |
| `guru-happy.svg` | **happy** — working tree clean |
| `guru-working.svg` | **working** — busy / running *(animated)* |
| `guru-sleeping.svg` | **sleeping** — paused / no project |
| `guru-asking.svg` | **asking** — needs your `[y/n]` *(animated)* |

## Icons & wordmark

| file | use |
|------|-----|
| `guru-icon.svg` | launcher / chip (256, fills the tile) |
| `guru-icon-16.svg` | favicon-size minimal mark |
| `guru-wordmark.svg` | logo lockup — mascot + `guru_` *(blinking cursor)* |
| `preview.png` | the whole kit at a glance |

## Palette

```
#4ade80  accent (green)           eyes: #9bf3b8 → #4ade80 → #2a9c57
#34343f  hair / bun               beard: #3a3a47 → #23232d   glasses: #c2c9d2
dark tile + bevel from DockTerm tokens.css (#1b1b23 → #0c0c0e)
```

Hand-generated from `../_gen-mascots.js`. The `working` and `asking` cursors animate
via inline SMIL (fall back to a solid block where SMIL isn't supported).
