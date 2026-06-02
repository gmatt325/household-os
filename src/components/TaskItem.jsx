const ASSIGNED_LABEL = {
  grant: 'Grant',
  ishita: 'Ishita',
  both: 'Both',
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function agedLabel(agedFromISO) {
  const from = parseISO(agedFromISO)
  const today = new Date()
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.round((todayLocal - from) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return null
  if (diff === 1) return 'yesterday'
  if (diff < 7) {
    const weekday = from.toLocaleDateString(undefined, { weekday: 'short' })
    return `from ${weekday}`
  }
  return `${diff}d ago`
}

export default function TaskItem({ task, index, onToggle, readOnly }) {
  const checked = !!task.completed
  const aged = !!task.aged_from && !checked
  const agedText = aged ? agedLabel(task.aged_from) : null
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); if (!readOnly) onToggle?.(task) }}
      onKeyDown={(e) => {
        if (readOnly) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle?.(task)
        }
      }}
      className={`task-stagger flex items-center gap-3 py-2 px-1 rounded-lg ${task.virtual_child ? 'pl-6' : ''} ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}`}
      style={{ '--i': index }}
    >
      <span
        className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 border-white/80 flex items-center justify-center transition ${
          checked ? 'bg-white/90' : 'bg-transparent'
        }`}
        aria-hidden
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-700">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>

      <span
        className={`flex-1 text-[14px] text-white ${
          checked ? 'line-through opacity-60' : ''
        } ${aged ? 'opacity-80' : ''}`}
      >
        {task.title}
      </span>

      {agedText && (
        <span className="text-[10px] uppercase tracking-wider font-sans font-medium text-white/90 bg-black/25 rounded-full px-2 py-0.5">
          {agedText}
        </span>
      )}

      {task.assigned_to && (
        <span className="text-[10px] uppercase tracking-wider font-sans font-medium text-white bg-white/20 rounded-full px-2.5 py-0.5">
          {ASSIGNED_LABEL[task.assigned_to] ?? task.assigned_to}
        </span>
      )}
    </div>
  )
}
