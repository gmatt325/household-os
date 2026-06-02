import { NavLink, useLocation } from 'react-router-dom'

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  )
}

export default function TabNav() {
  const { pathname } = useLocation()
  const dark = pathname.startsWith('/dashboard/fitness')

  const base =
    'px-6 py-3 text-xs uppercase tracking-widest font-sans border-b-2 transition-colors'
  const active = dark
    ? 'border-white text-white'
    : 'border-stone-700 text-stone-700'
  const inactive = dark
    ? 'border-transparent text-zinc-500 hover:text-zinc-300'
    : 'border-transparent text-stone-400 hover:text-stone-600'

  const refreshClass = dark
    ? 'text-zinc-400 hover:text-zinc-200'
    : 'text-stone-400 hover:text-stone-700'

  return (
    <nav
      className={`sticky top-0 z-20 flex items-stretch border-b ${
        dark
          ? 'bg-zinc-950 border-zinc-800'
          : 'bg-white/95 backdrop-blur border-stone-200'
      }`}
    >
      <div className="flex flex-1">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          Home
        </NavLink>
        <NavLink
          to="/dashboard/fitness"
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        >
          Fitness
        </NavLink>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        aria-label="Refresh"
        title="Refresh"
        className={`flex items-center justify-center min-w-[44px] min-h-[44px] px-4 transition-colors ${refreshClass}`}
      >
        <RefreshIcon />
      </button>
    </nav>
  )
}
