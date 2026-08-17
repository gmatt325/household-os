import { useMemo, useState } from 'react'
import { usePuppyDay } from '../hooks/usePuppyDay.js'
import { clipSessionsToDay, SLEEP_DAY_MIN } from '../lib/sleep.js'
import { todayISO, formatClock, formatClockShort } from '../lib/date.js'
import TimelineEditSheet from './TimelineEditSheet.jsx'

const TRACK_H = 720 // px for a full 24h
const GUIDES = [
  { min: 0, label: '12a' },
  { min: 360, label: '6a' },
  { min: 720, label: '12p' },
  { min: 1080, label: '6p' },
  { min: 1440, label: '12a' },
]

// Track width and horizontal offsets from the centre line, in px. Pee and poop
// pills mirror each other either side of the track, each on a leader line back
// to the exact minute; the walk lane sits outboard of the poop pills with its
// own leader and a minutes-only pill. WALK_LANE_X is a fixed constant rather
// than derived from pill width — labels vary ("12:15p" is wider than "3:04a")
// and a fixed offset can't collide. Tuned to fit a 390px phone.
// Measured against a 390px viewport: the widest poop pill ("💩 12:15p") ends at
// 97px, the walk lane clears it by 8px, and the walk pill ("120m") lands 7px
// inside the 167px half-width. Don't grow these without re-checking that.
const TRACK_W = 44
const LEADER = 10 // pee/poop connector length
const WALK_LANE_X = 105
const WALK_LANE_W = 8
const WALK_LEADER = 6

function isoOf(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayOptions(count = 14) {
  const out = []
  const base = new Date()
  base.setHours(12, 0, 0, 0)
  for (let i = 0; i < count; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    out.push({
      iso: isoOf(d),
      label:
        i === 0
          ? 'Today'
          : i === 1
          ? 'Yesterday'
          : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }
  return out
}

// One day laid out vertically, midnight to midnight: asleep (in crate) vs awake
// along the track, walks as accent segments beside it, pee on the left and poop
// on the right. Tap anything to retime or delete it.
export default function DayTimeline({ dayISO, onDayChange, now, night }) {
  const { events, sessions, dayStartMs, dayEndMs, loading, error, refetch } = usePuppyDay(dayISO)
  const [editing, setEditing] = useState(null) // { kind: 'event'|'session', row }

  const options = useMemo(() => dayOptions(14), [])
  const isToday = dayISO === todayISO()

  const pct = (min) => `${(min / SLEEP_DAY_MIN) * 100}%`

  const ready = dayStartMs != null
  // The day only fills as far as "now" when it's today; past days are complete.
  const capMin = !ready
    ? 0
    : isToday
    ? Math.max(0, Math.min(SLEEP_DAY_MIN, (now - dayStartMs) / 60000))
    : SLEEP_DAY_MIN
  const openEndMs = ready ? (isToday ? now : dayEndMs) : 0

  const crateBands = ready ? clipSessionsToDay(sessions, 'crate', dayStartMs, dayEndMs, openEndMs) : []
  const walkBands = ready ? clipSessionsToDay(sessions, 'walk', dayStartMs, dayEndMs, openEndMs) : []

  // Awake windows are the gaps between crate bands. A gap's edges ARE the
  // neighbouring crate sessions' ended_at / started_at, so editing an edge
  // writes to that one session and nothing beyond it. `prev`/`next` are null
  // where the gap runs from midnight or up to now — those edges aren't editable.
  const awakeBands = useMemo(() => {
    const out = []
    let cursor = 0
    let prev = null
    for (const band of crateBands) {
      if (band.startMin > cursor) {
        out.push({ startMin: cursor, endMin: band.startMin, prev, next: band })
      }
      if (band.endMin > cursor) {
        cursor = band.endMin
        prev = band
      }
    }
    if (cursor < capMin) out.push({ startMin: cursor, endMin: capMin, prev, next: null })
    // Sub-minute slivers can't be tapped and would just stack hit targets.
    return out.filter((g) => g.endMin - g.startMin >= 1)
  }, [crateBands, capMin])

  // Clearing "Ended" in the sheet re-opens a session, which the DB refuses if
  // another of that type is already running. Let the sheet say so up front.
  const openOther = (s) =>
    sessions.some((o) => o.session_type === s.session_type && !o.ended_at && o.id !== s.id)

  const marks = ready
    ? events
        .filter((e) => e.event_type === 'pee' || e.event_type === 'poop')
        .map((e) => ({
          event: e,
          min: (new Date(e.occurred_at).getTime() - dayStartMs) / 60000,
          accident: e.detail?.location === 'indoor_accident',
        }))
        .filter((m) => m.min >= 0 && m.min <= SLEEP_DAY_MIN)
    : []

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-3 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-widest text-pup-muted">Timeline</p>
        <select
          value={dayISO}
          onChange={(e) => onDayChange(e.target.value)}
          className="min-h-[36px] rounded-lg border border-pup-line bg-white px-2 text-xs text-pup-ink focus:outline-none focus:border-pup-accent"
        >
          {options.map((o) => (
            <option key={o.iso} value={o.iso}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-pup-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-sleep" /> asleep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-awake" /> awake
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-accent" /> walk
        </span>
      </div>

      <p className="-mt-2 mb-4 text-[11px] text-pup-muted/80">Tap a block to retime it.</p>

      {error && <p className="py-6 text-sm text-pup-red">Couldn't load this day.</p>}

      {!error && (
        <div className="relative" style={{ height: TRACK_H }}>
          {/* Hour guides. -translate-y-1/2 centres the rule ON its time — without
              it the row's top edge lands there and the line draws half a row low. */}
          {GUIDES.map((g) => (
            <div
              key={g.min}
              className="absolute left-0 right-0 flex -translate-y-1/2 items-center gap-2"
              style={{ top: pct(g.min) }}
            >
              <span className="w-7 flex-none text-[9px] text-pup-muted/70">{g.label}</span>
              <span className="h-px flex-1 bg-pup-line/70" />
            </div>
          ))}

          {/* 24h track: awake base with asleep blocks on top. Square edges —
              these are time spans, and rounding blurs where they start and end. */}
          <div
            className="absolute top-0 -translate-x-1/2 overflow-hidden bg-pup-line"
            style={{ left: '50%', width: TRACK_W, height: '100%' }}
          >
            <div className="absolute left-0 top-0 w-full bg-pup-awake" style={{ height: pct(capMin) }} />
          </div>

          {/* Awake windows — transparent hit targets over the base awake fill.
              Rendered before the crate bands so an opaque band always wins if a
              minHeight-padded sliver overlaps it. */}
          {awakeBands.map((g) => (
            <button
              key={`awake-${g.startMin}`}
              type="button"
              onClick={() =>
                setEditing({
                  kind: 'awake',
                  startMin: g.startMin,
                  endMin: g.endMin,
                  prev: g.prev?.session ?? null,
                  next: g.next?.session ?? null,
                  dayStartMs,
                  openEndMs,
                })
              }
              aria-label={`Awake ${formatClock(dayStartMs + g.startMin * 60000)}`}
              className="absolute -translate-x-1/2"
              style={{
                left: '50%',
                width: TRACK_W,
                top: pct(g.startMin),
                height: pct(g.endMin - g.startMin),
                minHeight: 4,
              }}
            />
          ))}

          {/* Asleep (crate) bands — tap to edit the session */}
          {crateBands.map((b) => (
            <button
              key={b.session.id}
              type="button"
              onClick={() => setEditing({ kind: 'session', row: b.session, openOther: openOther(b.session) })}
              aria-label={`Crate ${formatClock(b.session.started_at)}`}
              className="absolute -translate-x-1/2 bg-pup-sleep"
              style={{
                left: '50%',
                width: TRACK_W,
                top: pct(b.startMin),
                height: pct(b.endMin - b.startMin),
                minHeight: 4,
              }}
            />
          ))}

          {/* Walk lanes, outboard of the poop pills: an accent bar spanning the
              walk, a leader from its midpoint, then a minutes-only pill. */}
          {walkBands.map((b) => (
            <button
              key={b.session.id}
              type="button"
              onClick={() => setEditing({ kind: 'session', row: b.session, openOther: openOther(b.session) })}
              aria-label={`Walk ${formatClock(b.session.started_at)}`}
              className="absolute flex items-center"
              style={{
                left: `calc(50% + ${WALK_LANE_X}px)`,
                top: pct(b.startMin),
                height: pct(b.endMin - b.startMin),
                minHeight: 8,
              }}
            >
              <span className="h-full flex-none bg-pup-accent" style={{ width: WALK_LANE_W }} />
              <span className="h-px flex-none bg-pup-line" style={{ width: WALK_LEADER }} />
              <span className="whitespace-nowrap rounded-full border border-pup-accent/40 bg-pup-card px-1 py-1 text-[11px] font-medium tabular-nums leading-none text-pup-accent">
                {Math.max(1, Math.round(b.endMin - b.startMin))}m
              </span>
            </button>
          ))}

          {/* Pee / poop pills, mirrored either side, each on a leader back to
              the track so the exact minute is unambiguous. */}
          {marks.map((m) => {
            const pee = m.event.event_type === 'pee'
            const leader = <span className="h-px flex-none bg-pup-line" style={{ width: LEADER }} />
            const pill = (
              <span
                className={`flex flex-none items-center gap-1 whitespace-nowrap rounded-full border bg-pup-card px-1 py-1 text-[11px] leading-none tabular-nums ${
                  m.accident ? 'border-pup-red bg-pup-red/10 text-pup-red' : 'border-pup-line text-pup-muted'
                }`}
              >
                <span className="text-[13px] leading-none">{pee ? '💧' : '💩'}</span>
                {formatClockShort(m.event.occurred_at)}
              </span>
            )
            return (
              <button
                key={m.event.id}
                type="button"
                onClick={() => setEditing({ kind: 'event', row: m.event })}
                aria-label={`${m.event.event_type} at ${formatClock(m.event.occurred_at)}`}
                className="absolute flex min-h-[28px] -translate-y-1/2 items-center"
                style={
                  pee
                    ? { right: `calc(50% + ${TRACK_W / 2}px)`, top: pct(m.min) }
                    : { left: `calc(50% + ${TRACK_W / 2}px)`, top: pct(m.min) }
                }
              >
                {pee ? (
                  <>
                    {pill}
                    {leader}
                  </>
                ) : (
                  <>
                    {leader}
                    {pill}
                  </>
                )}
              </button>
            )
          })}

          {/* Now marker (today only) */}
          {isToday && ready && (
            <div
              className="pointer-events-none absolute left-0 right-0 flex -translate-y-1/2 items-center"
              style={{ top: pct(capMin) }}
            >
              <span className="ml-7 h-px flex-1 bg-pup-ink/30" />
              <span className="ml-1 text-[9px] text-pup-ink/50">now</span>
            </div>
          )}
        </div>
      )}

      {loading && <p className="mt-3 text-[11px] uppercase tracking-widest text-pup-muted">Loading…</p>}

      {editing && (
        <TimelineEditSheet
          target={editing}
          night={night}
          onClose={() => setEditing(null)}
          onChanged={refetch}
        />
      )}
    </div>
  )
}
