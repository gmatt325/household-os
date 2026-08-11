import { weekdayShort, todayISO } from '../lib/date.js'

// Last 7 local calendar days as ISO strings, oldest → newest.
function last7Days() {
  const out = []
  const base = new Date(todayISO() + 'T12:00:00')
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

function rateColor(pct) {
  if (pct == null) return 'text-pup-muted'
  if (pct >= 80) return 'text-pup-ok'
  if (pct >= 50) return 'text-pup-amber'
  return 'text-pup-red'
}

function Chip({ emoji, value, warn }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
        warn ? 'bg-pup-red/10 text-pup-red' : 'bg-pup-bg text-pup-ink'
      }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {value}
    </span>
  )
}

// One "Today" card: big potty-success %, icon-chip counts, and the 7-day trend
// tucked underneath. Replaces the old RollupStrip + TrendChart. Day mode only.
export default function TodayCard({ today, rows }) {
  const rate = today?.success_rate != null ? Number(today.success_rate) : null
  const byDay = Object.fromEntries((rows ?? []).map((r) => [r.day, r]))
  const days = last7Days()

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-5">
      {/* Headline + counts */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-5xl font-bold tabular-nums leading-none ${rateColor(rate)}`}>
            {rate != null ? `${rate}%` : '—'}
          </p>
          <p className="mt-1.5 text-xs text-pup-muted">potty success today</p>
        </div>
        <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">
          <Chip emoji="💧" value={today?.pee_count ?? 0} />
          <Chip emoji="💩" value={today?.poop_count ?? 0} />
          <Chip emoji="⚠️" value={today?.accident_count ?? 0} warn={(today?.accident_count ?? 0) > 0} />
          <Chip emoji="🍽️" value={today?.meal_count ?? 0} />
        </div>
      </div>

      {/* 7-day trend */}
      <div className="mt-5 border-t border-pup-line pt-4">
        <p className="mb-3 text-[11px] uppercase tracking-widest text-pup-muted">Last 7 days</p>
        <div className="flex items-end gap-2">
          {days.map((day) => {
            const dayRate = byDay[day]?.success_rate
            const has = dayRate != null
            const pct = has ? Number(dayRate) : 0
            const color = pct >= 80 ? 'bg-pup-ok' : pct >= 50 ? 'bg-pup-amber' : 'bg-pup-red'
            const isToday = day === todayISO()
            return (
              <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-14 w-full items-end overflow-hidden rounded-lg bg-pup-bg">
                  {has && (
                    <div className={`w-full rounded-lg ${color} transition-[height]`} style={{ height: `${Math.max(pct, 6)}%` }} />
                  )}
                </div>
                <span className={`text-[10px] uppercase ${isToday ? 'font-bold text-pup-ink' : 'text-pup-muted/70'}`}>
                  {weekdayShort(day)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
