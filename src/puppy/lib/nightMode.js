import { useCallback, useEffect, useState } from 'react'

// Night mode for the Puppy tab switches automatically on the device clock:
// on at 22:00, off at 06:00. The ☀️/🌙 button is an override for the *current*
// period only — it self-clears at the next boundary, so you can flip back to day
// mode at 11pm without night mode being stuck off tomorrow night.
// Shared across components (TabNav + page) via a custom window event.
const KEY = 'puppy-night-override'
const EVENT = 'puppy-night-change'

const NIGHT_START = 22 // 10pm
const NIGHT_END = 6 // 6am

export function isNightHour(d = new Date()) {
  const h = d.getHours()
  return h >= NIGHT_START || h < NIGHT_END
}

function dateKey(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Identifies the block of time we're in. The night block spans midnight, so the
// small hours key off the previous calendar day — 11pm Aug 15 and 3am Aug 16 are
// both "2026-08-15-night", and an override set at 11pm survives until 6am.
function periodKey(d = new Date()) {
  const h = d.getHours()
  if (h >= NIGHT_START) return `${dateKey(d)}-night`
  if (h < NIGHT_END) {
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 1)
    return `${dateKey(prev)}-night`
  }
  return `${dateKey(d)}-day`
}

function read() {
  const auto = isNightHour()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return auto
    const saved = JSON.parse(raw)
    if (saved?.period !== periodKey()) return auto // stale — back to automatic
    return saved.value === true
  } catch {
    return auto
  }
}

export function useNightMode() {
  const [night, setNight] = useState(read)

  useEffect(() => {
    const sync = () => setNight(read())
    // Re-check on a timer so the mode flips while the app sits open across the
    // 10pm/6am boundary, and on focus so a backgrounded phone catches up at once.
    const id = setInterval(sync, 30000)
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync) // cross-tab
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(id)
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !read()
    localStorage.setItem(KEY, JSON.stringify({ period: periodKey(), value: next }))
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [night, toggle]
}
