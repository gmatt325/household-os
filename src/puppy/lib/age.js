// Age formatting for the Puppy tab's Age card.
//
// The headline unit tracks how people actually talk about a puppy's age:
// weeks until 16 weeks, then months, then years + months after the first
// birthday. The small line under it always carries the full breakdown.

// Noon anchor: puppy_profile.dob is a YYYY-MM-DD string, and parsing it at
// midnight lets a DST shift or a UTC offset land it on the previous day.
function birthDate(dob) {
  return new Date(dob + 'T12:00:00')
}

// Whole completed calendar months between birth and `nowMs`. Same rule as
// targets.js's ageInMonths, but measured against the caller's clock — that one
// reads new Date() internally, which would let the headline (derived from
// nowMs) and the breakdown disagree.
function monthsSince(birth, nowMs) {
  const now = new Date(nowMs)
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

// The date `months` whole months after birth — the anniversary the remaining
// weeks/days are measured from.
function addMonths(date, months) {
  const d = new Date(date.getTime())
  const targetMonth = d.getMonth() + months
  d.setMonth(targetMonth)
  // setMonth overflows short months (Jan 31 + 1mo → Mar 3), so pull it back
  // to the last day of the intended month.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0)
  return d
}

// Joins the non-zero components, largest first: "2mo 3w 4d", "1y 2mo 3w".
function breakdown(years, remMonths, remWeeks, remDays) {
  const parts = []
  if (years) parts.push(`${years}y`)
  if (remMonths) parts.push(`${remMonths}mo`)
  if (remWeeks) parts.push(`${remWeeks}w`)
  if (remDays) parts.push(`${remDays}d`)
  return parts.length ? parts.join(' ') : '0d'
}

// → { primary, unit, detail } — or null when there's no dob to work from.
export function formatAge(dob, nowMs = Date.now()) {
  if (!dob) return null
  const birth = birthDate(dob)
  if (Number.isNaN(birth.getTime())) return null

  const totalDays = Math.max(0, Math.floor((nowMs - birth.getTime()) / 86400000))
  const totalWeeks = Math.floor(totalDays / 7)

  const months = monthsSince(birth, nowMs)
  const years = Math.floor(months / 12)
  const remMonths = months % 12

  // Days since the most recent month-anniversary, split into weeks + days.
  const sinceAnniversary = Math.max(
    0,
    Math.floor((nowMs - addMonths(birth, months).getTime()) / 86400000),
  )
  const remWeeks = Math.floor(sinceAnniversary / 7)
  const remDays = sinceAnniversary % 7

  const detail = breakdown(years, remMonths, remWeeks, remDays)

  if (totalWeeks < 16) {
    return { primary: String(totalWeeks), unit: totalWeeks === 1 ? 'week' : 'weeks', detail }
  }
  if (years < 1) {
    return { primary: String(months), unit: months === 1 ? 'month' : 'months', detail }
  }
  return {
    primary: remMonths ? `${years}y ${remMonths}mo` : `${years}y`,
    unit: 'old',
    detail,
  }
}
