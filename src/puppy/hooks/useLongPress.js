import { useRef } from 'react'

// Tap + long-press handlers for one element, as a props object to spread.
//
// The tap is a plain CLICK and the long-press is driven by pointer timers —
// never the other way round. Everything in this tab lives inside a scroll
// container (PuppyPager's snap scroller, the trend card's week strip), and iOS
// Safari cancels the pointer stream for a touch that starts in one: a
// pointerup-synthesized tap gets silently dropped while the click still fires.
export function useLongPress(onTap, onLongPress, { delay = 500, moveTolerance = 16 } = {}) {
  const timer = useRef(null)
  const suppressClick = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  function clear() {
    clearTimeout(timer.current)
    timer.current = null
  }

  function handleDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    suppressClick.current = false
    startPos.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => {
      clear()
      suppressClick.current = true // swallow the click that trails the press
      onLongPress?.()
    }, delay)
  }

  function handleMove(e) {
    if (!timer.current) return
    // 16px, not 10 — a thumb on a big card rolls further than a careful
    // fingertip, which is what made those cards feel dead.
    if (
      Math.abs(e.clientX - startPos.current.x) > moveTolerance ||
      Math.abs(e.clientY - startPos.current.y) > moveTolerance
    ) {
      clear()
    }
  }

  function handleClick() {
    clear()
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onTap?.()
  }

  return {
    onClick: handleClick,
    onPointerDown: handleDown,
    onPointerMove: handleMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    // Native scrolling takes the gesture over and stops sending pointermove, so
    // without this the long-press timer survives a swipe and fires mid-scroll.
    onPointerCancel: clear,
    onContextMenu: (e) => e.preventDefault(),
    // Keep the iOS callout/selection out of the long-press gesture.
    style: { WebkitTouchCallout: 'none' },
  }
}
