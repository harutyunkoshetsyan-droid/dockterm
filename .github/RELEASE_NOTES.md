<!-- RELEASE NOTES — keep ONLY the current release's "What's new" here. CI uses
     this whole file for the release body (replacing __VER__), so do NOT append
     past versions; replace this section each release. Older notes live in the
     git history and on each previous GitHub release. -->

## 🎯 What's new in v__VER__ — snappier scrolling & no more `cd` freeze

**Performance**
- Fixed a **multi-second freeze** when `cd`-ing into iCloud-synced folders (`~/Desktop`, `~/Documents`) or other very large directories — the folder scan is now async and time-bounded, so the terminal never stalls.

**Terminal scrolling**
- Scrolling is now **instant and snappy** — no easing/animation — so the wheel and trackpad feel exactly like the native macOS Terminal / gnome-terminal, with a faster step per notch.

**Top bar**
- On narrow windows the top bar now **adapts** — the controls wrap to a second row and labels shorten instead of getting clipped or crammed.

---

## 🎯 Previously in v0.25.0 — steadier terminals, Linux fixes & handy new tools

**Terminal fixes**
- Fixed the **random garbled / "letters-on-letters"** rendering — the GPU renderer now recovers from context loss and terminals always start at the correct size.
- **No more multi-second freeze** when opening or splitting a terminal after `cd`-ing into another folder (worst on Linux).
- **Smoother, faster scrolling** that feels like a native terminal.
- Every split pane now shows its **own live label** (Claude Code's terminal title).

**Linux**
- **munu now works on Linux** — the floating mascot actually appears and is clickable (Wayland's lack of global cursor/positioning is worked around).
- **Ctrl+Shift+C / Ctrl+Shift+V** now copy & paste in the terminal.

**Dock & Git**
- The Files / Git dock now correctly **follows the focused pane's directory** — no more stale "This folder isn't a Git repository" after a `cd`.

**New**
- **Quick notes** — a top-bar scratchpad that **auto-saves** (no save button) and persists across sessions.
- **Live file search** in the file tree — filters as you type.
- The **project name** in the top bar, **clearer split/close pane controls**, and a full **application menu** (File / Edit / View / Window).
- Clicking **munu** now just opens its popup (no surprise jump to the terminal).

**Usage**
- 5-hour **reset times anchor to your real session-limit resets**, with a self-calibrating budget — closer to `/status` than ever. Still read entirely from your local sessions.

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
