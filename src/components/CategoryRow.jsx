import { useState } from 'react'
import DotButton from './DotButton.jsx'
import IndicatorDot from './IndicatorDot.jsx'
import TaskItem from './TaskItem.jsx'

function lightenHex(hex, amount = 0.08) {
  const h = hex.replace('#', '')
  const num = parseInt(h, 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  r = Math.min(255, Math.round(r + (255 - r) * amount))
  g = Math.min(255, Math.round(g + (255 - g) * amount))
  b = Math.min(255, Math.round(b + (255 - b) * amount))
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export default function CategoryRow({
  categoryKey,
  label,
  color,
  tasks,
  loading,
  onToggle,
}) {
  const [expanded, setExpanded] = useState(false)
  const hasTasks = tasks.length > 0
  const allComplete = hasTasks && tasks.every((t) => t.completed)
  const lighter = lightenHex(color, 0.08)

  const pillStyle = {
    background: `linear-gradient(135deg, ${lighter} 0%, ${color} 100%)`,
    boxShadow:
      '0 2px 4px rgba(0,0,0,0.1), 0 6px 18px rgba(0,0,0,0.12), 0 14px 32px rgba(0,0,0,0.08)',
    borderRadius: expanded ? '26px' : '44px',
    transition:
      'border-radius 380ms cubic-bezier(.4,0,.2,1), flex-grow 380ms cubic-bezier(.4,0,.2,1)',
    flexGrow: expanded ? 1 : 0,
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-[108px] shrink-0 text-right font-serif text-[15px] uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => hasTasks && setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (!hasTasks) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="min-w-0 px-3 py-2 cursor-pointer select-none"
        style={pillStyle}
        aria-expanded={expanded}
      >
        {!hasTasks ? (
          <div className="px-2 py-3 text-white/80 font-sans text-[12px] italic">
            {loading ? 'Loading…' : 'Nothing today'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {tasks.map((t) => (
                <DotButton key={t.id} task={t} onToggle={onToggle} />
              ))}
            </div>

            {expanded && (
              <div className="border-t border-white/25 pt-2">
                {tasks.map((t, i) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    index={i}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <IndicatorDot
        expanded={expanded}
        allComplete={allComplete}
        onClick={() => hasTasks && setExpanded((v) => !v)}
      />
    </div>
  )
}
