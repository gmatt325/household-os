import { useEffect, useRef } from 'react'

// Shared chip row for the puppy sheets. `chipCls` is the styling primitive
// (LogSheet's RelativeChips uses it directly); `Chips` is the generic renderer.
export const chipCls = (on, night) =>
  `min-w-[52px] flex-none rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
    on
      ? 'border-pup-accent bg-pup-accent/10 text-pup-accent'
      : night
      ? 'border-pup-nightline text-pup-nightink'
      : 'border-pup-line text-pup-ink'
  }`

// `scroll` swaps the wrap for a single horizontal row. overscroll-x-contain
// stops a fling here from chaining out to the tab-wide PuppyPager underneath.
export default function Chips({ options, selected, onSelect, night, isSelected, scroll = false, children }) {
  const box = useRef(null)

  // A scrolling row opens at its left edge, which used to be fine when the
  // default was always the first option. The left-% row now opens on the LAST
  // reading, so bring it into view or the selection looks unset.
  useEffect(() => {
    if (!scroll || !box.current) return
    const el = box.current.querySelector('[data-on="true"]')
    if (el) box.current.scrollLeft = Math.max(0, el.offsetLeft - box.current.clientWidth / 2 + el.offsetWidth / 2)
    // Mount only: re-running on every pick would fight the user's own scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={box}
      className={scroll ? '-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 py-0.5' : 'flex flex-wrap gap-2'}
    >
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o
        const label = typeof o === 'object' ? o.label : `${o}%`
        const on = isSelected(val, selected)
        return (
          <button
            key={label}
            type="button"
            data-on={on ? 'true' : 'false'}
            onClick={() => onSelect(val)}
            className={chipCls(on, night)}
          >
            {label}
          </button>
        )
      })}
      {children}
    </div>
  )
}
