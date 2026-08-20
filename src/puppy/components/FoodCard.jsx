// Today's food, from the bowl chain (totals computed once in Puppy.jsx — the
// Food tile needs the same numbers). The hero is cups PUT DOWN: how much food
// went out is the number that's actually known, where "eaten" is an estimate
// derived from however often anyone happened to check the bowl.
export default function FoodCard({ totals }) {
  const { putDownCups, servings, eatenCups, leftCups } = totals

  return (
    <div className="rounded-2xl border border-pup-line bg-pup-card p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-bold tabular-nums leading-none text-pup-ink">
            {putDownCups.toFixed(2)}
            <span className="ml-1.5 text-lg font-semibold text-pup-muted">cups</span>
          </p>
          <p className="mt-1.5 text-xs text-pup-muted">put down today</p>
        </div>
        <div className="text-right text-xs text-pup-muted">
          <p>
            {servings} {servings === 1 ? 'serving' : 'servings'}
          </p>
          <p className="mt-1">
            ~{eatenCups.toFixed(2)} eaten · {leftCups > 0 ? `${leftCups.toFixed(2)} left` : 'bowl empty'}
          </p>
        </div>
      </div>
    </div>
  )
}
