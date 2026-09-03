// How big is she going to get — the one place the growth model lives.
//
// The whole thing rests on one idea: a puppy is a roughly fixed FRACTION of her
// adult weight at a given age. Divide a logged weight by that fraction and you
// get an estimate of the adult dog; multiply an adult estimate back through the
// curve and you get a projection to draw. Everything below is that, twice.

export const ADULT_AGE_MONTHS = 12 // small breeds are done growing around a year
export const CHART_DOMAIN_MONTHS = 18 // plot half a year past that, so the curve visibly flattens

const MONTH_MS = 30.4375 * 86400000
export const DAY_MS = 86400000

// Fraction of adult weight by age in months, for a small breed. Anchors, not a
// formula: growth is fast-then-slow in a shape no tidy curve matches, and a
// table is the thing a vet chart actually is. Sanity check against Poppy's own
// numbers — 5.6 lb at 2.6 months ÷ 0.41 ≈ 13.7 lb adult, against a 12 lb goal.
const GROWTH_ANCHORS = [
  [0, 0.05],
  [0.5, 0.11],
  [1, 0.18],
  [1.5, 0.26],
  [2, 0.33],
  [3, 0.47],
  [4, 0.6],
  [5, 0.71],
  [6, 0.79],
  [7, 0.86],
  [8, 0.91],
  [9, 0.95],
  [10, 0.98],
  [12, 1],
]

// Linear interpolation between anchors; flat at 1 once she's grown.
export function growthFraction(ageMonths) {
  if (!(ageMonths > 0)) return GROWTH_ANCHORS[0][1]
  if (ageMonths >= ADULT_AGE_MONTHS) return 1
  for (let i = 1; i < GROWTH_ANCHORS.length; i++) {
    const [x1, y1] = GROWTH_ANCHORS[i]
    if (ageMonths <= x1) {
      const [x0, y0] = GROWTH_ANCHORS[i - 1]
      return y0 + ((ageMonths - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return 1
}

// Noon anchor, same reason as age.js: a bare YYYY-MM-DD parsed at midnight can
// land on the previous day across a UTC offset.
export function birthMs(dob) {
  if (!dob) return null
  const t = new Date(dob + 'T12:00:00').getTime()
  return Number.isNaN(t) ? null : t
}

export function ageMonthsAt(birth, ms) {
  return Math.max(0, (ms - birth) / MONTH_MS)
}

export function domainEndMs(birth) {
  return birth + CHART_DOMAIN_MONTHS * MONTH_MS
}

const MIN_AGE_MONTHS = 0.75 // under ~3 weeks the fraction is small enough that dividing by it amplifies noise
const SPREAD = 0.15

// → { low, mid, high, from } or null. `from` says whether the estimate came from
// her actual logs or fell back to the profile's target weight.
//
// target_weight_lbs is deliberately NOT blended in: it's what you're aiming for,
// the band is what the scale says, and keeping them separate is the only way the
// chart can tell you she's tracking above or below the goal.
export function estimateAdult(rows, dob, targetLbs) {
  const birth = birthMs(dob)
  const target = Number(targetLbs) > 0 ? Number(targetLbs) : null

  const picks = []
  if (birth != null) {
    for (const r of rows ?? []) {
      const lbs = Number(r.detail?.lbs)
      if (!(lbs > 0)) continue
      const months = ageMonthsAt(birth, new Date(r.occurred_at).getTime())
      if (months < MIN_AGE_MONTHS) continue
      picks.push({ months, adult: lbs / growthFraction(months) })
    }
  }

  if (picks.length < 2) {
    if (!target) return null
    return { low: target * (1 - SPREAD), mid: target, high: target * (1 + SPREAD), from: 'target' }
  }

  // Recency-weighted: a reading at 3 months says far more about the adult dog
  // than one at 4 weeks, where a few ounces swing the whole extrapolation.
  picks.sort((a, b) => a.months - b.months)
  let weightSum = 0
  let sum = 0
  picks.forEach((p, i) => {
    const w = i + 1
    weightSum += w
    sum += w * p.adult
  })
  const mid = sum / weightSum
  const adults = picks.map((p) => p.adult)

  return {
    low: Math.min(mid * (1 - SPREAD), ...adults),
    mid,
    high: Math.max(mid * (1 + SPREAD), ...adults),
    from: 'logs',
  }
}

// The projected band across a time window, sampled for the SVG paths.
export function bandSamples(dob, fromMs, toMs, adult, steps = 60) {
  const birth = birthMs(dob)
  if (birth == null || !adult) return []
  const out = []
  for (let i = 0; i <= steps; i++) {
    const t = fromMs + ((toMs - fromMs) * i) / steps
    const f = growthFraction(ageMonthsAt(birth, t))
    out.push({ t, low: adult.low * f, mid: adult.mid * f, high: adult.high * f })
  }
  return out
}
