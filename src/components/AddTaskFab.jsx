import { useState } from 'react'
import AddTaskModal from './AddTaskModal.jsx'

export default function AddTaskFab({ onAdded }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add task"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-stone-700 text-white shadow-lg flex items-center justify-center hover:bg-stone-800 active:scale-95 transition"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {open && (
        <AddTaskModal onClose={() => setOpen(false)} onAdded={onAdded} />
      )}
    </>
  )
}
