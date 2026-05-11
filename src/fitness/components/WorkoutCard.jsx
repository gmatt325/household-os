import { useNavigate } from 'react-router-dom'
import MorningStretch from './MorningStretch.jsx'

const TYPE_COLORS = {
  lift: 'bg-blue-600',
  cardio: 'bg-orange-500',
  stretch: 'bg-emerald-600',
  rest: 'bg-zinc-600',
}

export default function WorkoutCard({ plan, isCompleted }) {
  const navigate = useNavigate()
  const typeColor = TYPE_COLORS[plan.type] ?? 'bg-zinc-600'
  const label = plan.label ?? plan.workout ?? plan.type

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className={`${typeColor} text-white text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full`}>
          {plan.type}
        </span>
        <span className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-widest px-3 py-1 rounded-full">
          {plan.time}
        </span>
        <span className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-widest px-3 py-1 rounded-full">
          {plan.location}
        </span>
        {isCompleted && (
          <span className="bg-emerald-900 text-emerald-400 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
            ✓ Logged
          </span>
        )}
      </div>

      <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
        {label}
      </h2>

      {plan.morning_stretch && (
        <MorningStretch stretch={plan.morning_stretch} />
      )}

      {plan.warmup && (
        <div className="border border-zinc-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Warmup</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{plan.warmup}</p>
        </div>
      )}

      {plan.notes && (
        <div className="border border-zinc-800 rounded-xl p-4">
          <p className="text-sm text-zinc-300 leading-relaxed">{plan.notes}</p>
        </div>
      )}

      {plan.exercises?.length > 0 && (
        <div>
          {plan.exercises.map((ex, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between py-3 border-b border-zinc-800 last:border-0"
            >
              <div>
                <span className="font-medium text-zinc-100">{ex.name}</span>
                {ex.note && (
                  <span className="text-zinc-500 text-xs ml-2">({ex.note})</span>
                )}
              </div>
              <span className="text-zinc-500 text-sm ml-4 text-right">
                {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ex.reps ?? ''}
                {ex.weight_lbs != null ? ` @ ${ex.weight_lbs} lbs` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {plan.type === 'lift' && (
        <button
          onClick={() => navigate('/dashboard/fitness/lift')}
          className="w-full py-4 bg-white text-zinc-950 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-zinc-200 active:scale-95 transition-all min-h-[56px]"
        >
          {isCompleted ? 'Log Another Set' : 'Start Logging'}
        </button>
      )}

      {plan.type === 'cardio' && (
        <button
          onClick={() => navigate('/dashboard/fitness/peloton')}
          className="w-full py-4 bg-white text-zinc-950 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-zinc-200 active:scale-95 transition-all min-h-[56px]"
        >
          {isCompleted ? 'Log Another Ride' : 'Start Peloton Log'}
        </button>
      )}

    </div>
  )
}
