// Local-date + elapsed helpers for the Puppy tab.

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// "2m" / "1h 20m" / "2d 3h" — compact count-up label. Minute granularity by
// default (sub-minute shows "0m"); pass { allowSeconds: true } for a seconds
// readout under a minute (used only by the Alone card).
export function formatElapsed(seconds, { allowSeconds = false } = {}) {
  if (seconds == null) return '—'
  const s = Math.max(0, Math.floor(seconds))
  if (allowSeconds && s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  if (h < 24) return remM ? `${h}h ${remM}m` : `${h}h`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return remH ? `${d}d ${remH}h` : `${d}d`
}

// "3:42 PM" for a timestamp — used in detail sheets / last-logged line.
export function formatClock(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// "3:42p" — the compact form the timeline pills use, where horizontal space is
// the binding constraint. Sheets keep the long formatClock form.
export function formatClockShort(iso) {
  return formatClock(iso)
    .replace(/\s*([AaPp])[Mm]$/, (_, half) => half.toLowerCase())
    .replace(/\s+/g, '')
}

// ISO string suitable for a datetime-local input value (local time, no seconds).
export function toDatetimeLocal(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Short weekday label for a v_puppy_daily "day" (YYYY-MM-DD) — trend chart axis.
export function weekdayShort(dayISO) {
  return new Date(dayISO + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })
}

// "9/1" — the compact date under a trend-chart bar, where the weekday sits above
// it and there's room for four characters at most.
export function shortDate(dayISO) {
  const d = new Date(dayISO + 'T12:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// "Aug 18" — the wider form used in the trend card's week header.
export function monthDay(dayISO) {
  return new Date(dayISO + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Calendar-day arithmetic on a YYYY-MM-DD string, staying in local time (a
// plain 86_400_000ms step lands an hour off across a DST boundary).
export function shiftDays(dayISO, delta) {
  const d = new Date(dayISO + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
