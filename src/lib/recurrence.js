const DAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const warned = new Set()

export function appliesToday(recurrence, date = new Date()) {
  if (!recurrence) return false
  const rule = String(recurrence).trim().toLowerCase()
  const dow = date.getDay()
  const todayCode = DAY_CODES[dow]

  if (rule === 'daily') return true
  if (rule === 'weekdays') return dow >= 1 && dow <= 5
  if (rule === 'weekends') return dow === 0 || dow === 6

  if (rule.startsWith('weekly:')) {
    const days = rule.slice(7).split(',').map((d) => d.trim())
    return days.includes(todayCode)
  }

  if (rule.startsWith('monthly:')) {
    const day = parseInt(rule.slice(8), 10)
    return Number.isFinite(day) && date.getDate() === day
  }

  if (!warned.has(rule)) {
    warned.add(rule)
    console.warn('Unknown recurrence rule:', rule)
  }
  return false
}
