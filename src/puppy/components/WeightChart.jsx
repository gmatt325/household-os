import { useMemo, useRef, useState } from 'react'
import Chips from './Chips.jsx'
import { monthDay } from '../lib/date.js'
import { DAY_MS, bandSamples, birthMs, domainEndMs, estimateAdult } from '../lib/growth.js'

// --- SVG geometry. One viewBox, scaled to the card width; every coordinate
// below is in viewBox units, and the pan handler converts screen px back through
// the same ratio. ---
const VB_W = 340
const VB_H = 210
const PAD_L = 26 // room for the lb labels
const PAD_R = 10
const PAD_T = 12
const PAD_B = 22 // room for the date labels
const PLOT_X = PAD_L
const PLOT_W = VB_W - PAD_L - PAD_R
const PLOT_Y = PAD_T
const PLOT_H = VB_H - PAD_T - PAD_B

const YEAR_MS = 365 * DAY_MS

// `life` and `all` are computed from her dob; the rest are fixed spans. The set
// exists because "a year" is the useful default but a 3-month-old's whole life
// is three months — see the range logic below.
const RANGES = [
  { value: 'life', label: 'Life' },
  { value: '3mo', label: '3mo', ms: 91 * DAY_MS },
  { value: '6mo', label: '6mo', ms: 183 * DAY_MS },
  { value: '1y', label: '1y', ms: YEAR_MS },
  { value: 'all', label: 'All' },
]

const round1 = (n) => Math.round(n * 10) / 10

function niceMax(raw) {
  const step = raw <= 6 ? 1 : raw <= 12 ? 2 : raw <= 30 ? 5 : 10
  return { yMax: Math.ceil(raw / step) * step, step }
}

// Her weight over time against a projected growth band. Takes no `now` — the
// page above re-renders every second off useNow, and nothing here changes faster
// than once a day, so today is resolved once per mount at day granularity.
export default function WeightChart({ rows, profile, loading }) {
  const todayMs = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d.getTime()
  }, [])

  const dob = profile?.dob ?? null
  const birth = birthMs(dob)
  const domainEnd = birth != null ? domainEndMs(birth) : 0
  const target = Number(profile?.target_weight_lbs) > 0 ? Number(profile.target_weight_lbs) : null

  // null = "still on the default", so the window self-initialises once the
  // profile lands (dob arrives a tick after mount) and stays yours after that.
  const [rangeKey, setRangeKey] = useState(null)
  const [windowStart, setWindowStart] = useState(null)
  const drag = useRef(null)

  const lifeMs = birth != null ? Math.max(DAY_MS, todayMs - birth) : YEAR_MS
  // A year, unless she hasn't lived one yet — then her whole life so far, which
  // is the only window where every point she has is on screen.
  const activeKey = rangeKey ?? (lifeMs < YEAR_MS ? 'life' : '1y')

  function rangeFor(key) {
    if (key === 'life') return lifeMs
    if (key === 'all') return Math.max(DAY_MS, domainEnd - birth)
    return RANGES.find((r) => r.value === key)?.ms ?? YEAR_MS
  }

  const rangeMs = rangeFor(activeKey)
  const maxStart = Math.max(birth, domainEnd - rangeMs)
  const clampStart = (t) => Math.min(Math.max(t, birth), maxStart)
  // Default window ends today, so you open on the part of the chart that exists.
  const start = windowStart != null ? clampStart(windowStart) : clampStart(Math.min(todayMs, domainEnd) - rangeMs)
  const end = start + rangeMs
  const canPan = maxStart - birth > DAY_MS

  const adult = useMemo(() => estimateAdult(rows, dob, target), [rows, dob, target])

  const points = useMemo(
    () =>
      (rows ?? [])
        .map((r) => ({ id: r.id, t: new Date(r.occurred_at).getTime(), lbs: Number(r.detail?.lbs) }))
        .filter((p) => p.lbs > 0 && Number.isFinite(p.t))
        .sort((a, b) => a.t - b.t),
    [rows],
  )

  const band = useMemo(
    () => (birth != null ? bandSamples(dob, start, end, adult) : []),
    [dob, birth, start, end, adult],
  )

  const { yMax, step } = useMemo(() => {
    const bandMax = band.length ? Math.max(...band.map((s) => s.high)) : 0
    const inWindow = points.filter((p) => p.t >= start && p.t <= end)
    const ptMax = inWindow.length ? Math.max(...inWindow.map((p) => p.lbs)) : 0
    return niceMax(Math.max(bandMax, ptMax, 1) * 1.12)
  }, [band, points, start, end])

  const x = (t) => PLOT_X + ((t - start) / rangeMs) * PLOT_W
  const y = (lbs) => PLOT_Y + (1 - lbs / yMax) * PLOT_H

  // ---- pan ----
  // touch-action: pan-y lets the page still scroll vertically over the chart
  // while claiming horizontal gestures for ourselves — otherwise PuppyPager's
  // snap scroller would eat the drag and flick back to the timeline.
  function onPointerDown(e) {
    if (!canPan) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    drag.current = { x: e.clientX, start, msPerPx: rangeMs / (rect.width * (PLOT_W / VB_W)) }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    setWindowStart(clampStart(d.start - (e.clientX - d.x) * d.msPerPx))
  }
  function endDrag() {
    drag.current = null
  }

  function pickRange(key) {
    setRangeKey(key)
    const r = rangeFor(key)
    const max = Math.max(birth, domainEnd - r)
    setWindowStart(Math.min(Math.max(Math.min(todayMs, domainEnd) - r, birth), max))
  }

  // ---- labels ----
  const spansYears = new Date(start).getFullYear() !== new Date(end).getFullYear()
  const xLabel = (t) => {
    const d = new Date(t)
    if (rangeMs <= 120 * DAY_MS) return `${d.getMonth() + 1}/${d.getDate()}`
    const mon = d.toLocaleDateString(undefined, { month: 'short' })
    return spansYears ? `${mon} '${String(d.getFullYear()).slice(2)}` : mon
  }
  const ticks = [0, 1 / 3, 2 / 3, 1].map((f, i) => ({
    t: start + rangeMs * f,
    anchor: i === 0 ? 'start' : i === 3 ? 'end' : 'middle',
  }))

  const latest = points.length ? points[points.length - 1] : null
  const headline =
    adult == null
      ? 'Log a couple of weigh-ins and an estimate appears here'
      : `Estimated adult ${Math.round(adult.low)}–${Math.round(adult.high)} lb${
          adult.from === 'target' ? ' — from your goal, not the scale yet' : ''
        }`

  const cardCls = 'rounded-2xl border border-pup-line bg-pup-card p-3 md:p-5'

  if (!dob) {
    return (
      <div className={cardCls}>
        <p className="text-[11px] uppercase tracking-widest text-pup-muted">Weight</p>
        <p className="py-10 text-center text-sm text-pup-muted">Set her birthday in the profile to chart her growth.</p>
      </div>
    )
  }

  const bandPath = band.length
    ? `M${band.map((s) => `${x(s.t).toFixed(1)},${y(s.high).toFixed(1)}`).join('L')}L${band
        .slice()
        .reverse()
        .map((s) => `${x(s.t).toFixed(1)},${y(s.low).toFixed(1)}`)
        .join('L')}Z`
    : null
  const midPath = band.length ? `M${band.map((s) => `${x(s.t).toFixed(1)},${y(s.mid).toFixed(1)}`).join('L')}` : null
  const linePath = points.length ? `M${points.map((p) => `${x(p.t).toFixed(1)},${y(p.lbs).toFixed(1)}`).join('L')}` : null

  const gridlines = []
  for (let v = 0; v <= yMax + 0.001; v += step) gridlines.push(v)

  return (
    <div className={cardCls}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <p className="text-[11px] uppercase tracking-widest text-pup-muted">Weight</p>
        {latest && (
          <p className="text-sm font-semibold tabular-nums text-pup-ink">
            {round1(latest.lbs)} lb <span className="font-normal text-pup-muted">· {monthDay(isoDay(latest.t))}</span>
          </p>
        )}
      </div>

      <p className="mb-3 text-xs text-pup-muted">
        {headline}
        {target && adult ? <span> · goal {round1(target)} lb</span> : null}
      </p>

      <div className="mb-3">
        <Chips
          options={RANGES}
          selected={activeKey}
          onSelect={pickRange}
          isSelected={(v, sel) => v === sel}
          scroll
        />
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        style={{ touchAction: 'pan-y' }}
        className={canPan ? 'cursor-grab select-none active:cursor-grabbing' : 'select-none'}
      >
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="Weight over time">
          <defs>
            <clipPath id="pup-weight-clip">
              <rect x={PLOT_X} y={PLOT_Y} width={PLOT_W} height={PLOT_H} />
            </clipPath>
          </defs>

          {/* lb gridlines */}
          {gridlines.map((v) => (
            <g key={v}>
              <line
                x1={PLOT_X}
                x2={PLOT_X + PLOT_W}
                y1={y(v)}
                y2={y(v)}
                className="stroke-pup-line"
                strokeWidth="1"
              />
              <text x={PLOT_X - 5} y={y(v) + 3} textAnchor="end" className="fill-pup-muted" fontSize="8">
                {v}
              </text>
            </g>
          ))}

          <g clipPath="url(#pup-weight-clip)">
            {/* Projected band: where the model says she should be. */}
            {bandPath && <path d={bandPath} className="fill-pup-accent" opacity="0.13" />}
            {midPath && (
              <path
                d={midPath}
                fill="none"
                className="stroke-pup-accent"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.55"
              />
            )}

            {/* The goal, only when it's on scale — on the birth-to-today view an
                adult target is far off the top and would flatten her real data. */}
            {target && target <= yMax && (
              <>
                <line
                  x1={PLOT_X}
                  x2={PLOT_X + PLOT_W}
                  y1={y(target)}
                  y2={y(target)}
                  className="stroke-pup-ok"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                />
                <text x={PLOT_X + 4} y={y(target) - 3} className="fill-pup-ok" fontSize="8">
                  goal {round1(target)} lb
                </text>
              </>
            )}

            {/* Today */}
            {todayMs >= start && todayMs <= end && (
              <>
                <line
                  x1={x(todayMs)}
                  x2={x(todayMs)}
                  y1={PLOT_Y}
                  y2={PLOT_Y + PLOT_H}
                  className="stroke-pup-ink"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <text x={x(todayMs) - 3} y={PLOT_Y + 8} textAnchor="end" className="fill-pup-ink" opacity="0.5" fontSize="8">
                  today
                </text>
              </>
            )}

            {/* What the scale actually said */}
            {linePath && <path d={linePath} fill="none" className="stroke-pup-ink" strokeWidth="2" />}
            {points.map((p) => (
              <circle key={p.id} cx={x(p.t)} cy={y(p.lbs)} r="3" className="fill-pup-ink" />
            ))}
          </g>

          {/* x axis */}
          <line
            x1={PLOT_X}
            x2={PLOT_X + PLOT_W}
            y1={PLOT_Y + PLOT_H}
            y2={PLOT_Y + PLOT_H}
            className="stroke-pup-line"
            strokeWidth="1"
          />
          {ticks.map((tk) => (
            <text
              key={tk.t}
              x={x(tk.t)}
              y={PLOT_Y + PLOT_H + 12}
              textAnchor={tk.anchor}
              className="fill-pup-muted"
              fontSize="8"
            >
              {xLabel(tk.t)}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pup-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-ink" /> logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-accent/40" /> estimate
        </span>
        {canPan && <span className="ml-auto">drag to pan</span>}
      </div>

      {loading && !points.length && (
        <p className="mt-2 text-[11px] uppercase tracking-widest text-pup-muted">Loading…</p>
      )}
    </div>
  )
}

// monthDay() wants a YYYY-MM-DD; the points carry epoch ms.
function isoDay(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
