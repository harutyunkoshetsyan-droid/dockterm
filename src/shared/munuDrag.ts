/**
 * Pure helpers for dragging the pinned munu overlay. Kept DOM-free so the drag
 * math can be unit-tested without a renderer.
 *
 * The overlay window is click-through on macOS and only becomes interactive
 * while the cursor is over munu. During a drag the window follows the cursor via
 * async IPC and can briefly fall behind, so these helpers are written to be
 * robust to a lost `pointerup`: a move only counts while the primary button is
 * actually held (see {@link primaryButtonHeld}).
 */

/** Cursor must travel this many pixels before a press counts as a drag, not a click. */
export const DRAG_THRESHOLD = 4

export interface DragAnchor {
  /** Cursor screen position when the drag started. */
  sx: number
  sy: number
  /** Overlay window top-left when the drag started. */
  wx: number
  wy: number
}

/** New overlay top-left so the window follows the cursor by the same delta. */
export function dragTarget(
  a: DragAnchor,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  return { x: a.wx + (screenX - a.sx), y: a.wy + (screenY - a.sy) }
}

/** True once the cursor has moved far enough to count as a drag (not a click). */
export function passedDragThreshold(a: DragAnchor, screenX: number, screenY: number): boolean {
  return Math.hypot(screenX - a.sx, screenY - a.sy) >= DRAG_THRESHOLD
}

/**
 * Whether the primary (left) mouse button is currently held.
 * `PointerEvent.buttons` is a bitmask; bit 0 (value 1) is the primary button.
 * A drag must end the instant the button is released — even if we never received
 * a `pointerup` (the overlay can briefly go click-through and swallow it), the
 * next move will report `buttons` without bit 0 and we can self-heal.
 */
export function primaryButtonHeld(buttons: number): boolean {
  return (buttons & 1) === 1
}

/** Whether a client point lies within a rect — used after a drag to decide if
 * the cursor is still over munu (keep interactive) or has left it (tuck away). */
export function pointInRect(
  x: number,
  y: number,
  rect: { left: number; top: number; right: number; bottom: number }
): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}
