import { describe, it, expect } from 'vitest'
import {
  DRAG_THRESHOLD,
  dragTarget,
  passedDragThreshold,
  pointInRect,
  primaryButtonHeld,
  type DragAnchor
} from '@shared/munuDrag'

const anchor: DragAnchor = { sx: 100, sy: 200, wx: 500, wy: 50 }

describe('dragTarget', () => {
  it('moves the window by the same delta as the cursor', () => {
    expect(dragTarget(anchor, 130, 180)).toEqual({ x: 530, y: 30 })
  })
  it('returns the original origin when the cursor has not moved', () => {
    expect(dragTarget(anchor, 100, 200)).toEqual({ x: 500, y: 50 })
  })
  it('handles negative results (dragging toward the screen edge)', () => {
    expect(dragTarget(anchor, 0, 0)).toEqual({ x: 400, y: -150 })
  })
})

describe('passedDragThreshold', () => {
  it('false for a tiny jitter below the threshold (a click, not a drag)', () => {
    expect(passedDragThreshold(anchor, 102, 201)).toBe(false)
  })
  it('true once the cursor travels at least the threshold distance', () => {
    expect(passedDragThreshold(anchor, 100 + DRAG_THRESHOLD, 200)).toBe(true)
    expect(passedDragThreshold(anchor, 110, 215)).toBe(true)
  })
})

describe('primaryButtonHeld', () => {
  it('true when the primary (left) button bit is set', () => {
    expect(primaryButtonHeld(1)).toBe(true)
    expect(primaryButtonHeld(0b011)).toBe(true) // primary + secondary
  })
  it('false when no button or only a non-primary button is held', () => {
    expect(primaryButtonHeld(0)).toBe(false) // released — must end the drag
    expect(primaryButtonHeld(2)).toBe(false) // secondary only
    expect(primaryButtonHeld(0b100)).toBe(false) // middle only
  })
})

describe('pointInRect', () => {
  const rect = { left: 10, top: 20, right: 110, bottom: 80 }
  it('true for a point inside (and on the edges)', () => {
    expect(pointInRect(50, 50, rect)).toBe(true)
    expect(pointInRect(10, 20, rect)).toBe(true)
    expect(pointInRect(110, 80, rect)).toBe(true)
  })
  it('false for a point outside any side', () => {
    expect(pointInRect(5, 50, rect)).toBe(false)
    expect(pointInRect(50, 200, rect)).toBe(false)
    expect(pointInRect(200, 50, rect)).toBe(false)
  })
})
