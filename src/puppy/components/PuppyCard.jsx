import { useRef } from 'react'

// Emoji sitting inside a progress ring. Ring fills toward the target and shifts
// green→amber→red; a full accent ring marks an active session; empty track when
// there's no data (progress null). Pulses gently when overdue (red).
function ProgressRing({ emoji, progress, status, active, night, size = 56 }) {
  const stroke = 4
  const r = (size - stroke * 2) / 2
  const c = 2 * Math.PI * r
  const track = night ? 'stroke-pup-nightline' : 'stroke-pup-line'
  const arc = active
    ? 'stroke-pup-accent'
    : status === 'red'
    ? 'stroke-pup-red'
    : status === 'amber'
    ? 'stroke-pup-amber'
    : 'stroke-pup-ok'
  const shown = active ? 1 : progress
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={status === 'red' && !active ? 'animate-[pupPulse_1.3s_ease-in-out_infinite]' : ''}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={track} />
        {shown != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={arc}
            style={{
              strokeDasharray: c,
              strokeDashoffset: c * (1 - Math.min(1, Math.max(0, shown))),
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              transition: 'stroke-dashoffset 0.6s ease',
            }}
          />
        )}
      </svg>
      <span className="absolute" style={{ fontSize: size * 0.42 }}>{emoji}</span>
    </div>
  )
}

// Big tap target. Tap = primary action; long-press (~500ms) = detail/backdate.
export default function PuppyCard({
  emoji,
  label,
  primary,
  secondary,
  status = 'neutral',
  active = false,
  progress = null,
  night = false,
  big = false,
  onTap,
  onLongPress,
}) {
  const timer = useRef(null)
  const longFired = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  function clear() {
    clearTimeout(timer.current)
    timer.current = null
  }

  function handleDown(e) {
    longFired.current = false
    startPos.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => {
      longFired.current = true
      onLongPress?.()
    }, 500)
  }
  function handleMove(e) {
    if (!timer.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx > 10 || dy > 10) clear()
  }
  function handleUp() {
    if (timer.current) {
      clear()
      if (!longFired.current) onTap?.()
    }
  }

  const border = active
    ? 'border-pup-accent'
    : status === 'red'
    ? 'border-pup-red'
    : status === 'amber'
    ? 'border-pup-amber'
    : night
    ? 'border-pup-nightline'
    : 'border-pup-line'

  const surface = active
    ? night
      ? 'bg-pup-accent/15'
      : 'bg-pup-accent/10'
    : night
    ? 'bg-pup-nightcard'
    : 'bg-pup-card'

  const primaryColor =
    status === 'red' ? 'text-pup-red' : status === 'amber' ? 'text-pup-amber' : active ? 'text-pup-accent' : ''

  return (
    <button
      type="button"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerLeave={clear}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none touch-manipulation flex flex-col items-start justify-between rounded-2xl border-2 p-4 text-left transition-colors active:scale-[0.98] ${border} ${surface} ${big ? 'min-h-[140px]' : 'min-h-[120px]'}`}
    >
      <div className="flex w-full items-center justify-between">
        <ProgressRing emoji={emoji} progress={progress} status={status} active={active} night={night} size={big ? 64 : 56} />
        <span className={`text-[11px] uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{label}</span>
      </div>
      <div className="mt-2">
        <p className={`font-bold tabular-nums leading-none ${big ? 'text-4xl' : 'text-3xl'} ${primaryColor}`}>{primary}</p>
        {secondary && (
          <p className={`mt-1.5 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{secondary}</p>
        )}
      </div>
    </button>
  )
}
