<!-- RELEASE NOTES — keep ONLY the current release's "What's new" here. CI uses
     this whole file for the release body (replacing __VER__), so do NOT append
     past versions; replace this section each release. Older notes live in the
     git history and on each previous GitHub release. -->

## 🎯 What's new in v0.14.0 — splitting never kills your session

- **Split or build a grid without losing Claude.** Terminals now live independently of the layout, so splitting a pane, making a grid, or closing a sibling no longer restarts your running shells — your Claude session keeps going.
- **Native-feeling scrolling.** Removed the scroll animation that fought the trackpad — scrolling is now instant and smooth like a normal terminal.
- **Clicked paths jump to the exact line.** Click `src/server.ts:42` in the output and DockTerm opens the file *and* scrolls to line 42.
- **munu over fullscreen, improved.** Better at staying visible (and re-appearing) over fullscreen apps.

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
