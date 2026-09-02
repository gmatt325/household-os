import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Sheet from './Sheet.jsx'
import { useLongPress } from '../hooks/useLongPress.js'
import { weekdayShort, shortDate, monthDay, shiftDays, todayISO } from '../lib/date.js'

const WEEKS = 12 // how far back the strip can be swiped — matches usePuppyDaily's window

// The last WEEKS*7 local days, oldest → newest, chunked into 7-day panes. Rolling
// windows, not calendar weeks: the last pane always ends today.
function weekPanes(today, weeks = WEEKS) {
  const days = []
  for (let i = weeks * 7 - 1; i >= 0; i--) days.push(shiftDays(today, -i))
  const panes = []
  for (let i = 0; i < days.length; i += 7) panes.push(days.slice(i, i + 7))
  return panes
}

function rateColor(pct) {
  if (pct == null) return 'text-pup-muted'
  if (pct >= 80) return 'text-pup-ok'
  if (pct >= 50) return 'text-pup-amber'
  return 'text-pup-red'
}

function barColor(pct) {
  return pct >= 80 ? 'bg-pup-ok' : pct >= 50 ? 'bg-pup-amber' : 'bg-pup-red'
}

function Chip({ emoji, value, warn }) {
  return (
    <span
      className={`inline-flex min-w-[52px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
        warn ? 'bg-pup-red/10 text-pup-red' : 'bg-pup-bg text-pup-ink'
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {value}
    </span>
  )
}

// One day column: tap selects it, long-press offers to open it on the timeline.
// Tap has to stay a plain click — the column sits inside two nested scroll
// containers, and iOS Safari drops a pointerup-synthesized tap in there.
function DayBar({ day, row, selected, onSelect, onHold }) {
  const press = useLongPress(() => onSelect(day), () => onHold(day))
  const pct = row?.success_rate != null ? Number(row.success_rate) : null

  return (
    <button
      type="button"
      {...press}
      aria-pressed={selected}
      className="flex flex-1 select-none touch-manipulation flex-col items-center gap-1.5"
    >
      <div
        className={`flex h-14 w-full items-end overflow-hidden rounded-lg bg-pup-bg ${
          selected ? 'ring-2 ring-pup-accent' : ''
        }`}
      >
        {pct != null && (
          <div
            className={`w-full rounded-lg ${barColor(pct)} transition-[height]`}
            style={{ height: `${Math.max(pct, 6)}%` }}
          />
        )}
      </div>
      <span className={`text-[10px] uppercase leading-tight ${selected ? 'font-bold text-pup-ink' : 'text-pup-muted/70'}`}>
        {weekdayShort(day)}
      </span>
      <span className={`-mt-1 text-[10px] tabular-nums leading-tight ${selected ? 'font-bold text-pup-ink' : 'text-pup-muted/70'}`}>
        {shortDate(day)}
      </span>
    </button>
  )
}

// Potty history in one card: the selected day's success rate and pee/poop
// accident split up top, a swipeable week-by-week bar strip below. Any day is
// tappable; a long-press offers to open that day on the timeline. Day mode only.
export default function TodayCard({ rows, onOpenTimeline }) {
  const today = todayISO()
  const panes = useMemo(() => weekPanes(today), [today])
  const byDay = useMemo(() => Object.fromEntries((rows ?? []).map((r) => [r.day, r])), [rows])

  const [selected, setSelected] = useState(today) // resets to today on reload
  const [holdDay, setHoldDay] = useState(null) // day awaiting the timeline confirm
  const [pane, setPane] = useState(panes.length - 1)
  const strip = useRef(null)

  // Open on the current week. Panes render oldest → newest, so that's the far
  // right — which is also why a reload always lands back on this week.
  useLayoutEffect(() => {
    const el = strip.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  function handleScroll() {
    const el = strip.current
    if (!el) return
    const w = el.clientWidth || 1
    setPane(Math.round(Math.min(panes.length - 1, Math.max(0, el.scrollLeft / w))))
  }

  function step(delta) {
    const el = strip.current
    if (!el) return
    el.scrollBy({ left: delta * el.clientWidth, behavior: 'smooth' })
  }

  const row = byDay[selected]
  const rate = row?.success_rate != null ? Number(row.success_rate) : null
  const peeAccidents = row?.pee_accident_count ?? 0
  const poopAccidents = row?.poop_accident_count ?? 0

  const when =
    selected === today
      ? 'today'
      : selected === shiftDays(today, -1)
      ? 'yesterday'
      : `${weekdayShort(selected)} ${shortDate(selected)}`

  const days = panes[pane] ?? []
  const paneLabel =
    pane === panes.length - 1 ? 'Last 7 days' : `${monthDay(days[0])} – ${monthDay(days[days.length - 1])}`

  const arrow =
    'flex h-8 w-8 flex-none items-center justify-center rounded-lg text-lg text-pup-muted transition-opacity disabled:opacity-25'

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-5">
      {/* Selected day: headline rate + the pee/poop accident split */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-5xl font-bold tabular-nums leading-none ${rateColor(rate)}`}>
            {rate != null ? `${rate}%` : '—'}
          </p>
          <p className="mt-1.5 text-xs text-pup-muted">potty success {when}</p>
        </div>
        <div className="flex flex-none flex-col gap-1.5">
          <div className="flex justify-end gap-1.5">
            <Chip emoji="💧" value={row?.pee_count ?? 0} />
            <Chip emoji="⚠️" value={peeAccidents} warn={peeAccidents > 0} />
          </div>
          <div className="flex justify-end gap-1.5">
            <Chip emoji="💩" value={row?.poop_count ?? 0} />
            <Chip emoji="⚠️" value={poopAccidents} warn={poopAccidents > 0} />
          </div>
        </div>
      </div>

      {/* Week strip — swipe or arrow back through previous weeks */}
      <div className="mt-5 border-t border-pup-line pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={() => step(-1)} disabled={pane === 0} aria-label="Previous week" className={arrow}>
            ‹
          </button>
          <p className="text-[11px] uppercase tracking-widest text-pup-muted">{paneLabel}</p>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={pane === panes.length - 1}
            aria-label="Next week"
            className={arrow}
          >
            ›
          </button>
        </div>

        {/* overscroll-x-contain so a fling here doesn't chain out to PuppyPager */}
        <div
          ref={strip}
          onScroll={handleScroll}
          className="-mx-1 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {panes.map((week) => (
            <div key={week[0]} className="flex w-full flex-none snap-center items-end gap-2 px-1">
              {week.map((day) => (
                <DayBar
                  key={day}
                  day={day}
                  row={byDay[day]}
                  selected={day === selected}
                  onSelect={setSelected}
                  onHold={setHoldDay}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {holdDay && (
        <Sheet title={`${weekdayShort(holdDay)} ${shortDate(holdDay)}`} onClose={() => setHoldDay(null)}>
          <div className="space-y-3">
            <p className="text-sm text-pup-muted">See everything that happened on this day?</p>
            <button
              type="button"
              onClick={() => {
                onOpenTimeline?.(holdDay)
                setHoldDay(null)
              }}
              className="min-h-[52px] w-full rounded-xl bg-pup-accent text-sm font-semibold uppercase tracking-widest text-white"
            >
              View timeline
            </button>
            <button
              type="button"
              onClick={() => setHoldDay(null)}
              className="min-h-[52px] w-full rounded-xl border-2 border-pup-line text-sm font-semibold uppercase tracking-widest text-pup-ink"
            >
              Cancel
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
