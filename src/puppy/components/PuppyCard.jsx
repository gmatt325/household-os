import { useLongPress } from '../hooks/useLongPress.js'

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
  unit,
  secondary,
  status = 'neutral',
  active = false,
  progress = null,
  night = false,
  big = false,
  wide = false,
  readOnly = false,
  onTap,
  onLongPress,
}) {
  const press = useLongPress(onTap, onLongPress)

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

  // readOnly cards (Age) still render as a button for layout parity, but drop
  // the press feedback so they don't look tappable.
  const shell = `select-none touch-manipulation rounded-2xl border-2 text-left transition-colors ${
    readOnly ? 'cursor-default' : 'active:scale-[0.98]'
  } ${border} ${surface}`
  const labelCls = `text-[11px] uppercase tracking-widest ${night ? 'text-zinc-500' : 'text-pup-muted'}`

  // Short horizontal row — used for cards that carry a value rather than a timer.
  if (wide) {
    return (
      <button type="button" {...press} className={`${shell} flex w-full min-h-[84px] items-center justify-between gap-4 px-4 py-3`}>
        <div className="flex items-center gap-3">
          <ProgressRing emoji={emoji} progress={progress} status={status} active={active} night={night} size={44} />
          <span className={labelCls}>{label}</span>
        </div>
        <div className="text-right">
          {primary != null && (
            <p className={`text-2xl font-bold tabular-nums leading-none ${primaryColor}`}>{primary}</p>
          )}
          {secondary && (
            <p className={`text-sm ${primary != null ? 'mt-1' : ''} ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{secondary}</p>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      {...press}
      className={`${shell} flex flex-col items-start justify-between p-4 ${big ? 'min-h-[140px]' : 'min-h-[120px]'}`}
    >
      <div className="flex w-full items-center justify-between">
        <ProgressRing emoji={emoji} progress={progress} status={status} active={active} night={night} size={big ? 64 : 56} />
        <span className={labelCls}>{label}</span>
      </div>
      <div className="mt-2">
        {primary != null && (
          <p className={`font-bold tabular-nums leading-none ${big ? 'text-4xl' : 'text-3xl'} ${primaryColor}`}>{primary}</p>
        )}
        {unit && (
          <p className={`mt-1 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{unit}</p>
        )}
        {secondary && (
          <p className={`mt-1.5 text-xs ${night ? 'text-zinc-500' : 'text-pup-muted'}`}>{secondary}</p>
        )}
      </div>
    </button>
  )
}
