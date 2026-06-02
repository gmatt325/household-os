import { useState } from 'react'
import { ADDABLE_CATEGORIES } from '../lib/categories.js'
import { useCreateTask } from '../hooks/useCreateTask.js'

const ASSIGNEES = [
  { key: 'both', label: 'Both' },
  { key: 'grant', label: 'Grant' },
  { key: 'ishita', label: 'Ishita' },
]

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const labelClass =
  'block font-serif text-[12px] uppercase tracking-wider text-stone-500'
const fieldClass =
  'w-full bg-white/70 border border-stone-300 rounded-xl px-4 py-3 font-sans text-[15px] text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-500'

function SegButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`py-2.5 rounded-xl font-sans text-[13px] border transition-colors ${
        active
          ? 'bg-stone-700 text-white border-stone-700'
          : 'bg-white/50 text-stone-600 border-stone-300 hover:bg-white/80'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}

export default function AddTaskModal({ onClose, onAdded }) {
  const [category, setCategory] = useState('todos')
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('both')
  const [hasDate, setHasDate] = useState(false)
  const [dueDate, setDueDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const { create, saving, error } = useCreateTask()

  const canSubmit = title.trim().length > 0 && !saving

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await create({
        title: title.trim(),
        category,
        assigned_to: assignee,
        due_date: hasDate ? dueDate : null,
        recurrence: null,
        notes: notes.trim() || null,
        completed: false,
      })
      onAdded?.()
      onClose?.()
    } catch {
      // error rendered inline below
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm" />
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="relative w-full max-w-[420px] m-4 bg-[#F7F0E8] rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-serif font-light text-[22px] uppercase tracking-[2px] text-stone-700">
          Add Task
        </h2>

        <div className="space-y-1.5">
          <label className={labelClass}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${fieldClass} appearance-none`}
          >
            {ADDABLE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Task</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Assigned to</label>
          <div className="grid grid-cols-3 gap-2">
            {ASSIGNEES.map((a) => (
              <SegButton
                key={a.key}
                active={assignee === a.key}
                onClick={() => setAssignee(a.key)}
              >
                {a.label}
              </SegButton>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>When</label>
          <div className="grid grid-cols-2 gap-2">
            <SegButton active={!hasDate} onClick={() => setHasDate(false)}>
              No date
            </SegButton>
            <SegButton active={hasDate} onClick={() => setHasDate(true)}>
              Specific date
            </SegButton>
          </div>
          {hasDate && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${fieldClass} mt-2`}
            />
          )}
          <p className="text-[11px] text-stone-400 font-sans">
            {hasDate
              ? 'Shows on that day; rolls over if missed.'
              : 'Shows today and stays until checked off.'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>
            Notes <span className="normal-case text-stone-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add a note…"
            className={`${fieldClass} resize-none`}
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-600 font-sans">
            Couldn't add task. Try again.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-sans text-[14px] text-stone-500 border border-stone-300 hover:bg-white/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl font-sans text-[14px] text-white bg-stone-700 disabled:opacity-40 hover:bg-stone-800 transition-colors"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
