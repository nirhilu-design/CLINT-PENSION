import { useRef } from 'react'

/**
 * Click-and-drag horizontal scrolling for a scroll container (mouse/trackpad).
 * Spread the returned props on the scrollable element. Uses incremental
 * `scrollBy` so it works in both RTL and LTR (content follows the pointer). A
 * real drag (moved past a small threshold) is suppressed from turning into a
 * click, so dragging the row never accidentally opens a card. Touch devices
 * scroll natively.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const s = useRef({ down: false, moved: false, startX: 0, lastX: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !ref.current) return // native touch scroll
    s.current = { down: true, moved: false, startX: e.clientX, lastX: e.clientX }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!s.current.down || !ref.current) return
    const dx = e.clientX - s.current.lastX
    s.current.lastX = e.clientX
    if (Math.abs(e.clientX - s.current.startX) > 4) s.current.moved = true
    if (s.current.moved) {
      // content follows the pointer; scrollBy respects RTL/LTR coordinate space
      ref.current.scrollBy({ left: -dx })
      e.preventDefault()
    }
  }
  const end = () => {
    s.current.down = false
  }
  // Runs in capture phase, before a child's onClick — swallow the click if we dragged.
  const onClickCapture = (e: React.MouseEvent) => {
    if (s.current.moved) {
      e.stopPropagation()
      e.preventDefault()
      s.current.moved = false
    }
  }

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onClickCapture,
    style: { cursor: 'grab', touchAction: 'pan-y' } as React.CSSProperties,
  }
}
