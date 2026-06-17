<!-- RELEASE NOTES — keep ONLY the current release's "What's new" here. CI uses
     this whole file for the release body (replacing __VER__), so do NOT append
     past versions; replace this section each release. Older notes live in the
     git history and on each previous GitHub release. -->

## 🎯 What's new in v0.19.0 — instant munu, correct dock

- **No more state lag.** When you answer in munu (Yes / Submit / a choice), the card now closes and munu updates **immediately** instead of ~2s later — it no longer waits for the just-answered menu to scroll out of the terminal buffer.
- **The dock shows the right project.** Fixed a case where panes whose folder had no `.git` of their own collapsed up to your home directory (because a `.git` in `$HOME` — dotfiles repos — was claiming them). The dock now stops at home and shows the actual folder.
- Plus everything from v0.18.0: fullscreen visibility, bigger/fully-visible card, robust multi-select, and the "Type something" text field.

---

## ⬇️ Download

| Your system | File to download |
|---|---|
| 🍎 **macOS — Apple Silicon** (M1 / M2 / M3 / M4) | **DockTerm-__VER__-macOS-Apple-Silicon.dmg** |
| 🍎 **macOS — Intel** | **DockTerm-__VER__-macOS-Intel.dmg** |
| 🪟 **Windows** 10 / 11 (64-bit) | **DockTerm-__VER__-Windows.exe** |
| 🐧 **Linux** (x86-64) | **DockTerm-__VER__-Linux.AppImage** |

**Not sure which Mac you have?** Apple menu → **About This Mac**. If the chip says *Apple M1/M2/M3/M4…* choose **Apple Silicon**; if it says *Intel* choose **Intel**.

The macOS builds are **signed and notarized by Apple**, so they open normally — no security warning.

---

DockTerm — a terminal-first workspace for Claude Code. No telemetry, no accounts.
