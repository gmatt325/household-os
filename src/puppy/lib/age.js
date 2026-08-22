// Age formatting for the Puppy tab's Age card.
//
// The headline unit tracks how people actually talk about a puppy's age:
// weeks until 16 weeks, then months, then years + months after the first
// birthday. The small line under it carries the breakdown — in the SAME unit
// family as the headline, so a "9 weeks" headline is never paired with a
// months-first detail like "2mo 1w 1d" (two units racing each other reads as a
// contradiction, not as extra precision).

// Noon anchor: puppy_profile.dob is a YYYY-MM-DD string, and parsing it at
// midnight lets a DST shift or a UTC offset land it on the previous day. It is
// a parse-safety anchor only — never measure elapsed age from it directly (see
// daysBetween).
function birthDate(dob) {
  return new Date(dob + 'T12:00:00')
}

function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Whole CALENDAR days between two instants — both ends pulled back to local
// midnight. Flooring raw elapsed ms from the noon anchor instead made the age
// roll over at noon rather than midnight, so every morning read a day short
// (and, on a week boundary, a whole week short). Round, not floor: a DST day is
// 23 or 25 hours long.
function daysBetween(fromMs, toMs) {
  return Math.max(0, Math.round((startOfDay(toMs) - startOfDay(fromMs)) / 86400000))
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

  const totalDays = daysBetween(birth.getTime(), nowMs)
  const totalWeeks = Math.floor(totalDays / 7)

  // Weeks headline → weeks + days detail, straight from birth. Zeros are kept
  // ("10w 0d") so the line holds one shape every day instead of collapsing to a
  // bare "10w" that just repeats the headline on week boundaries.
  if (totalWeeks < 16) {
    return {
      primary: String(totalWeeks),
      unit: totalWeeks === 1 ? 'week' : 'weeks',
      detail: `${totalWeeks}w ${totalDays % 7}d`,
    }
  }

  const months = monthsSince(birth, nowMs)
  const years = Math.floor(months / 12)
  const remMonths = months % 12

  // Days since the most recent month-anniversary, split into weeks + days.
  const sinceAnniversary = daysBetween(addMonths(birth, months).getTime(), nowMs)
  const remWeeks = Math.floor(sinceAnniversary / 7)
  const remDays = sinceAnniversary % 7

  const detail = breakdown(years, remMonths, remWeeks, remDays)

  if (years < 1) {
    return { primary: String(months), unit: months === 1 ? 'month' : 'months', detail }
  }
  return {
    primary: remMonths ? `${years}y ${remMonths}mo` : `${years}y`,
    unit: 'old',
    detail,
  }
}
