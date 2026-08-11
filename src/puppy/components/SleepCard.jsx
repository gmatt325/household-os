import { buildSleepDay, SLEEP_DAY_MIN } from '../lib/sleep.js'
import { formatElapsed } from '../lib/date.js'

const GUIDES = [
  { min: 0, label: '12a' },
  { min: 360, label: '6a' },
  { min: 720, label: '12p' },
  { min: 1080, label: '6p' },
  { min: 1440, label: '12a' },
]

// Awake vs asleep for the day (asleep = in the crate), on a fixed 24h track that
// fills up to now. `now` is ticking ms so the bar grows through the day.
export default function SleepCard({ sessions, now }) {
  const { runs, asleepMin, awakeMin, nowMin } = buildSleepDay(sessions, now)
  const pct = (min) => `${(min / SLEEP_DAY_MIN) * 100}%`

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-widest text-pup-muted">Sleep</p>
        <p className="text-[11px] text-pup-muted">goal ~20h/day</p>
      </div>

      {/* Totals */}
      <div className="mb-4 flex gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-sleep" />
            <span className="text-2xl font-bold tabular-nums text-pup-ink">{formatElapsed(asleepMin * 60)}</span>
          </div>
          <p className="mt-0.5 text-xs text-pup-muted">asleep</p>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-pup-awake" />
            <span className="text-2xl font-bold tabular-nums text-pup-ink">{formatElapsed(awakeMin * 60)}</span>
          </div>
          <p className="mt-0.5 text-xs text-pup-muted">awake</p>
        </div>
      </div>

      {/* 24h track */}
      <div className="relative h-4 w-full overflow-hidden rounded-full bg-pup-line">
        {runs.map((r, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${r.asleep ? 'bg-pup-sleep' : 'bg-pup-awake'}`}
            style={{ left: pct(r.startMin), width: pct(r.endMin - r.startMin) }}
          />
        ))}
        {/* now marker */}
        <div className="absolute top-0 h-full w-px bg-pup-ink/40" style={{ left: pct(nowMin) }} />
      </div>

      {/* 6-hour guides */}
      <div className="relative mt-1 h-3">
        {GUIDES.map((g) => (
          <span
            key={g.min}
            className="absolute -translate-x-1/2 text-[9px] text-pup-muted/70"
            style={{ left: pct(g.min) }}
          >
            {g.label}
          </span>
        ))}
      </div>
    </div>
  )
}
