// Total volume of food eaten today, from meal events' { made_cups, ate_pct }.
export default function FoodCard({ events, now }) {
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const midnightMs = midnight.getTime()

  let eaten = 0
  let made = 0
  let count = 0
  for (const e of events ?? []) {
    if (e.event_type !== 'meal') continue
    if (new Date(e.occurred_at).getTime() < midnightMs) continue
    count += 1
    const m = Number(e.detail?.made_cups)
    if (!Number.isFinite(m)) continue
    made += m
    const pct = Number(e.detail?.ate_pct)
    eaten += m * (Number.isFinite(pct) ? pct / 100 : 1)
  }

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-bold tabular-nums leading-none text-pup-ink">
            {eaten.toFixed(2)}
            <span className="ml-1.5 text-lg font-semibold text-pup-muted">cups</span>
          </p>
          <p className="mt-1.5 text-xs text-pup-muted">eaten today</p>
        </div>
        <p className="text-xs text-pup-muted">
          of {made.toFixed(2)} made · {count} {count === 1 ? 'meal' : 'meals'}
        </p>
      </div>
    </div>
  )
}
