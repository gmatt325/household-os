export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function formatDayLabel(isoDate) {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function weekStartISO(isoDate) {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
