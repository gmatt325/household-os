import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const navBtn =
  'flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-pup-accent px-4 text-xs font-semibold uppercase tracking-widest text-pup-accent transition-opacity disabled:opacity-25'

// Two-page horizontal pager for the whole tab: swipe and the entire surface
// moves. Native scroll-snap does the gesture work — no library, and scrollbars
// are hidden globally. The container takes the active page's height (the two
// differ a lot, so lerping it would drag content under your finger mid-swipe)
// and the window scrolls back to the top whenever the page changes.
export default function PuppyPager({ labels, children }) {
  const scrollRef = useRef(null)
  const pageRefs = useRef([])
  const [index, setIndex] = useState(0)
  const [height, setHeight] = useState(null)
  const settled = useRef(0)
  const scrolling = useRef(false)
  const scrollEndTimer = useRef(null)

  const pages = Array.isArray(children) ? children : [children]
  const count = pages.length

  const activeIndex = useCallback(() => {
    const el = scrollRef.current
    if (!el) return 0
    const width = el.clientWidth || 1
    return Math.round(Math.min(count - 1, Math.max(0, el.scrollLeft / width)))
  }, [count])

  // Re-measure after every render — pages change height as data loads and as the
  // clock ticks. setState bails out when the value is unchanged. Skipped while a
  // swipe is in flight: the two pages differ a lot in height, and resizing the
  // element the finger (or momentum scroll) is actively driving mid-gesture is
  // what causes iOS Safari to render a torn/undersized frame during the swipe.
  const measure = useCallback(() => {
    const active = activeIndex()
    setIndex(active)
    if (scrolling.current) return
    const h = pageRefs.current[active]?.offsetHeight
    if (h) setHeight(h)
  }, [activeIndex])

  useLayoutEffect(measure)

  // The dot/index feedback can track the scroll live (cheap, no layout impact).
  // The height commit waits for the gesture to go quiet for a beat — covers
  // both touch swipes and goTo's programmatic smooth-scroll.
  const handleScroll = useCallback(() => {
    scrolling.current = true
    setIndex(activeIndex())
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current)
    scrollEndTimer.current = setTimeout(() => {
      scrolling.current = false
      measure()
    }, 150)
  }, [activeIndex, measure])

  useEffect(() => () => clearTimeout(scrollEndTimer.current), [])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    for (const el of pageRefs.current) if (el) ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  // Landing on a new page should start you at the top of it, not wherever you
  // happened to be scrolled on the previous one.
  useEffect(() => {
    if (settled.current === index) return
    settled.current = index
    const el = scrollRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
  }, [index])

  function goTo(i) {
    const el = scrollRef.current
    if (!el) return
    const target = Math.min(count - 1, Math.max(0, i))
    // Safari can fight a programmatic smooth scroll on a snap-mandatory
    // container and bounce straight back, so drop snap for the jump.
    el.style.scrollSnapType = 'none'
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' })
    setTimeout(() => {
      el.style.scrollSnapType = ''
    }, 500)
  }

  return (
    <div>
      {/* Full-bleed: cancel PuppyLayout's padding, re-apply it per page */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={height ? { height } : undefined}
        className="-mx-4 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain transition-[height] duration-200 md:-mx-6"
      >
        {pages.map((page, i) => (
          <div
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el
            }}
            className="w-full flex-none snap-center px-4 md:px-6"
          >
            {page}
          </div>
        ))}
      </div>

      {/* Backup nav for pointers that can't swipe. Dots show where you are. */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className={navBtn}>
          <span aria-hidden="true">‹</span> {labels[0]}
        </button>

        <div className="flex items-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={labels[i]}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                  index === i ? 'bg-pup-accent' : 'bg-pup-line'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === count - 1}
          className={navBtn}
        >
          {labels[count - 1]} <span aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  )
}
