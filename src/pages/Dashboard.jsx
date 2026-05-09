import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTodaysTasks } from '../hooks/useTodaysTasks.js'
import { useToggleTask } from '../hooks/useToggleTask.js'
import CategoryRow from '../components/CategoryRow.jsx'

const ROWS = [
  { key: 'puppy', label: 'Puppy', color: '#C4724A' },
  { key: 'todos', label: 'Tasks', color: '#7A6590' },
  { key: 'workouts', label: 'Workouts', color: '#4A8E72' },
  { key: 'plant_watering', label: 'Plants', color: '#6A9A42' },
]

function formatDate(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { tasks, loading, error, setOptimistic, clearOptimistic } =
    useTodaysTasks()
  const toggle = useToggleTask({ setOptimistic, clearOptimistic })
  const dateLabel = useMemo(() => formatDate(), [])

  return (
    <div className="min-h-full">
      <div className="max-w-[520px] mx-auto px-6 py-8">
        <header className="flex items-baseline justify-between mb-10">
          <h1 className="font-serif font-light text-[28px] uppercase tracking-[2px] text-stone-700">
            Household
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[12px] text-stone-500">
              {dateLabel}
            </span>
            <button
              onClick={signOut}
              title={user?.email ?? ''}
              className="font-sans text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-600"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <p className="text-sm text-red-600 mb-4">
            Failed to load tasks: {error.message}
          </p>
        )}

        <div className="space-y-4">
          {ROWS.map((row) => (
            <CategoryRow
              key={row.key}
              categoryKey={row.key}
              label={row.label}
              color={row.color}
              tasks={tasks[row.key] ?? []}
              loading={loading}
              onToggle={toggle}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
