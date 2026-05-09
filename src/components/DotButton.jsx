export default function DotButton({ task, onToggle }) {
  const checked = !!task.completed
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle?.(task)
      }}
      className="relative shrink-0 w-[62px] h-[62px] rounded-full border border-white/80 bg-white/[0.18] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      aria-pressed={checked}
      aria-label={task.title}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-black/[0.18] transition-transform duration-[260ms] ease-out"
        style={{ transform: checked ? 'scale(1)' : 'scale(0)' }}
      />
      <span className="absolute inset-0 flex items-center justify-center px-1">
        <span className="font-sans font-bold text-[9.5px] leading-tight text-white text-center line-clamp-2">
          {task.title}
        </span>
      </span>
    </button>
  )
}
