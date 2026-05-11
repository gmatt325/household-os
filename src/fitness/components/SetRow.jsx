function Stepper({ value, onChange, step = 1, inputMode = 'numeric', placeholder }) {
  const num = parseFloat(value)
  const dec = () => {
    const next = isNaN(num) ? 0 : Math.max(0, num - step)
    onChange(String(next % 1 === 0 ? next : next.toFixed(1)))
  }
  const inc = () => {
    const next = isNaN(num) ? step : num + step
    onChange(String(next % 1 === 0 ? next : next.toFixed(1)))
  }

  return (
    <div className="flex gap-2 items-stretch w-full min-w-0">
      <button
        type="button"
        onClick={dec}
        className="w-12 flex-shrink-0 bg-zinc-800 rounded-xl text-2xl font-bold text-zinc-300 active:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center min-h-[56px]"
      >
        −
      </button>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 text-2xl font-bold text-center text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-400 min-h-[56px]"
      />
      <button
        type="button"
        onClick={inc}
        className="w-12 flex-shrink-0 bg-zinc-800 rounded-xl text-2xl font-bold text-zinc-300 active:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center min-h-[56px]"
      >
        +
      </button>
    </div>
  )
}

export default function SetRow({ setIndex, setData, plannedReps, isBodyweight, exIdx, dispatch }) {
  const label = `Set ${setIndex + 1}`

  if (isBodyweight) {
    return (
      <div className="py-4 border-b border-zinc-800">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
        <Stepper
          value={setData.duration_sec}
          onChange={(v) => dispatch({ type: 'SET_DURATION', exIdx, setIdx: setIndex, value: v })}
          step={5}
          placeholder={plannedReps}
        />
        <p className="text-xs text-zinc-600 mt-1">seconds</p>
      </div>
    )
  }

  return (
    <div className="py-4 border-b border-zinc-800">
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <Stepper
            value={setData.weight_lbs}
            onChange={(v) => dispatch({ type: 'SET_WEIGHT', exIdx, setIdx: setIndex, value: v })}
            step={5}
            inputMode="decimal"
            placeholder="lbs"
          />
          <p className="text-xs text-zinc-600 mt-1">weight (lbs)</p>
        </div>
        <div className="flex-1">
          <Stepper
            value={setData.reps}
            onChange={(v) => dispatch({ type: 'SET_REPS', exIdx, setIdx: setIndex, value: v })}
            step={1}
            placeholder={plannedReps}
          />
          <p className="text-xs text-zinc-600 mt-1">reps</p>
        </div>
      </div>
    </div>
  )
}
