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
