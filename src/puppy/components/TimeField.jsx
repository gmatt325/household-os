import { useState } from 'react'
import { todayISO } from '../lib/date.js'
import { chipCls } from './Chips.jsx'

// Time-first replacement for <input type="datetime-local">. Same value contract
// — a local 'YYYY-MM-DDTHH:mm' string, or '' for blank — so callers keep passing
// it straight to new Date(). The split matters on iOS: datetime-local opens a
// full calendar + wheel, but 99% of edits are "slide it back an hour today", so
// the time gets the big field and the date hides behind a chip that only opens
// when the entry really was on another day.
function shiftDay(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowTime() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dayLabel(dateISO) {
  if (!dateISO) return 'Today'
  if (dateISO === todayISO()) return 'Today'
  if (dateISO === shiftDay(-1)) return 'Yesterday'
  return new Date(`${dateISO}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TimeField({ value, onChange, night, disabled = false }) {
  const [datePart, timePart] = (value || '').split('T')
  const d = datePart || todayISO()
  const t = timePart || ''
  const [dayOpen, setDayOpen] = useState(false)

  const field = night
    ? 'bg-pup-nightbg border-pup-nightline text-pup-nightink'
    : 'bg-white border-pup-line text-pup-ink'

  // Clearing the time clears the whole value — that's how "still running" is
  // expressed for an open session, and it has to survive this indirection.
  const setTime = (v) => onChange(v ? `${d}T${v}` : '')
  const setDate = (v) => onChange(`${v}T${t || nowTime()}`)

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="time"
          value={t}
          disabled={disabled}
          onChange={(e) => setTime(e.target.value)}
          className={`min-w-0 flex-1 rounded-xl border px-4 text-lg font-semibold min-h-[52px] focus:outline-none focus:border-pup-accent disabled:opacity-50 ${field}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDayOpen((o) => !o)}
          className={`flex-none rounded-xl border px-3 text-sm font-medium min-h-[52px] disabled:opacity-50 ${
            dayOpen ? 'border-pup-accent text-pup-accent' : field
          }`}
        >
          {dayLabel(datePart)} <span aria-hidden="true" className="text-xs">▾</span>
        </button>
      </div>

      {dayOpen && !disabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setDate(todayISO())} className={chipCls(d === todayISO(), night)}>
            Today
          </button>
          <button type="button" onClick={() => setDate(shiftDay(-1))} className={chipCls(d === shiftDay(-1), night)}>
            Yesterday
          </button>
          <input
            type="date"
            value={d}
            onChange={(e) => setDate(e.target.value)}
            className={`min-w-[140px] flex-1 rounded-xl border px-3 text-sm min-h-[44px] focus:outline-none focus:border-pup-accent ${field}`}
          />
        </div>
      )}
    </div>
  )
}
