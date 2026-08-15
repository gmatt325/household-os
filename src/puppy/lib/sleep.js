// Sleep-vs-awake timeline for the Puppy tab. "Asleep" = in the crate, derived
// from crate sessions. The day resets at local midnight and spans a fixed 24h.

const SEG = 10 // minutes per segment
const DAY_MIN = 24 * 60

function localMidnightMs(nowMs) {
  const d = new Date(nowMs)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Overlap of [a1,a2] and [b1,b2] in minutes.
function overlapMin(a1, a2, b1, b2) {
  const lo = Math.max(a1, b1)
  const hi = Math.min(a2, b2)
  return hi > lo ? (hi - lo) / 60000 : 0
}

// Build today's asleep/awake breakdown from crate sessions.
// Returns { runs:[{asleep,startMin,endMin}], asleepMin, awakeMin, nowMin }.
export function buildSleepDay(sessions, nowMs) {
  const midnight = localMidnightMs(nowMs)
  const nowMin = Math.max(0, Math.min(DAY_MIN, (nowMs - midnight) / 60000))

  // Crate intervals clipped to [midnight, now], in ms.
  const crate = (sessions ?? [])
    .filter((s) => s.session_type === 'crate')
    .map((s) => {
      const start = new Date(s.started_at).getTime()
      const end = s.ended_at ? new Date(s.ended_at).getTime() : nowMs
      return [Math.max(start, midnight), Math.min(end, nowMs)]
    })
    .filter(([a, b]) => b > a)

  const segCount = Math.ceil(nowMin / SEG)
  const segs = [] // asleep booleans per 10-min segment
  let asleepMin = 0
  for (let i = 0; i < segCount; i++) {
    const segStartMin = i * SEG
    const segEndMin = Math.min((i + 1) * SEG, nowMin)
    const segLen = segEndMin - segStartMin
    if (segLen <= 0) break
    const segStartMs = midnight + segStartMin * 60000
    const segEndMs = midnight + segEndMin * 60000
    let overlap = 0
    for (const [a, b] of crate) overlap += overlapMin(a, b, segStartMs, segEndMs)
    asleepMin += overlap
    segs.push(overlap >= segLen / 2) // majority asleep
  }

  // Merge consecutive same-state segments into runs.
  const runs = []
  for (let i = 0; i < segs.length; i++) {
    const asleep = segs[i]
    const startMin = i * SEG
    const endMin = Math.min((i + 1) * SEG, nowMin)
    const last = runs[runs.length - 1]
    if (last && last.asleep === asleep) last.endMin = endMin
    else runs.push({ asleep, startMin, endMin })
  }

  return { runs, asleepMin, awakeMin: Math.max(0, nowMin - asleepMin), nowMin }
}

export const SLEEP_DAY_MIN = DAY_MIN

// Sessions of one type clipped to a day window, as minute offsets from the day's
// start. Unlike buildSleepDay's merged 10-min runs these map 1:1 to rows, so the
// timeline can make each band tappable. `openEndMs` caps a still-running session
// (pass `now` for today so an open crate stops at the current time).
export function clipSessionsToDay(sessions, type, dayStartMs, dayEndMs, openEndMs = dayEndMs) {
  const out = []
  for (const s of sessions ?? []) {
    if (s.session_type !== type) continue
    const start = new Date(s.started_at).getTime()
    const end = s.ended_at ? new Date(s.ended_at).getTime() : openEndMs
    const a = Math.max(start, dayStartMs)
    const b = Math.min(end, dayEndMs)
    if (b <= a) continue
    out.push({
      session: s,
      startMin: (a - dayStartMs) / 60000,
      endMin: (b - dayStartMs) / 60000,
    })
  }
  return out.sort((x, y) => x.startMin - y.startMin)
}
