<!-- RELEASE NOTES — keep ONLY the current release's "What's new" here. CI uses
     this whole file for the release body (replacing __VER__), so do NOT append
     past versions; replace this section each release. Older notes live in the
     git history and on each previous GitHub release. -->

## 🎯 What's new in v0.15.0 — munu that fits, and the right font back

- **Fixed the terminal font.** A v0.14.0 regression dropped the bundled mono font; it's restored, so the terminal reads cleanly again.
- **munu's card fits perfectly.** The floating card now sizes itself to its content — small for a quick Yes/No, taller when there are many options — and the full question + every option are shown (no more clipped text).
- **Multi-select prompts.** When Claude offers a checkbox (multi-select) menu, munu shows real toggles and a Submit button so you can pick several and submit.
- **Only pops when you can't see it.** The option card only appears when the asking terminal is on a background tab or window — when you're already looking at it, munu just animates + chimes without getting in the way.
- **Splits/grids still keep your session, native scrolling, click-to-line** (from v0.14.0).

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
