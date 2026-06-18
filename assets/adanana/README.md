# adanana — the sunny one

A member of the **munu family**: a little DockTerm creature whose face mirrors what
DockTerm is doing. adanana is the sunny girly one — a soft rounded terminal-tile with
a green **banana-leaf sprout** ("ada-*nana*" 🍌), **eyelashes**, warm blush, and
bright **amber** features.

Same dark tile, feet, and 5-state expression system as [munu](../munu) — only the
silhouette, accent, and accessories differ.

## Expressions (face = app state)

| file | state |
|------|-------|
| `adanana.svg` | **resting** — idle / ready |
| `adanana-happy.svg` | **happy** — working tree clean |
| `adanana-working.svg` | **working** — busy / running *(animated)* |
| `adanana-sleeping.svg` | **sleeping** — paused / no project |
| `adanana-asking.svg` | **asking** — needs your `[y/n]` *(animated)* |

## Icons & wordmark

| file | use |
|------|-----|
| `adanana-icon.svg` | launcher / chip (256, fills the tile) |
| `adanana-icon-16.svg` | favicon-size minimal mark |
| `adanana-wordmark.svg` | logo lockup — mascot + `adanana_` *(blinking cursor)* |
| `preview.png` | the whole kit at a glance |

## Palette

```
#fbbf24  accent (amber)           eyes: #ffe08a → #fbbf24 → #d18a09
#2fa45f  leaf sprout              blush: #ff9e6b
dark tile + bevel from DockTerm tokens.css (#221e18 → #0e0c09)
```

Hand-generated from `../_gen-mascots.js`. The `working` and `asking` cursors animate
via inline SMIL (fall back to a solid block where SMIL isn't supported).
