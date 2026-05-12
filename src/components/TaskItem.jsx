const ASSIGNED_LABEL = {
  grant: 'Grant',
  ishita: 'Ishita',
  both: 'Both',
}

export default function TaskItem({ task, index, onToggle, readOnly }) {
  const checked = !!task.completed
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !readOnly && onToggle?.(task)}
      onKeyDown={(e) => {
        if (readOnly) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle?.(task)
        }
      }}
      className={`task-stagger flex items-center gap-3 py-2 px-1 rounded-lg ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}`}
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
        }`}
      >
        {task.title}
      </span>

      {task.assigned_to && (
        <span className="text-[10px] uppercase tracking-wider font-sans font-medium text-white bg-white/20 rounded-full px-2.5 py-0.5">
          {ASSIGNED_LABEL[task.assigned_to] ?? task.assigned_to}
        </span>
      )}
    </div>
  )
}
