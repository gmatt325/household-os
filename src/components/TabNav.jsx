import { NavLink, useLocation } from 'react-router-dom'
import { useNightMode } from '../puppy/lib/nightMode.js'

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

// Per-route theme. Puppy has a warm palette in day mode and flips dark at night.
function themeFor(pathname, night) {
  if (pathname.startsWith('/dashboard/fitness')) {
    return {
      nav: 'bg-zinc-950 border-zinc-800',
      active: 'border-white text-white',
      inactive: 'border-transparent text-zinc-500 hover:text-zinc-300',
      refresh: 'text-zinc-400 hover:text-zinc-200',
    }
  }
  if (pathname.startsWith('/dashboard/puppy')) {
    return night
      ? {
          nav: 'bg-pup-nightbg border-pup-nightline',
          active: 'border-pup-accent text-pup-nightink',
          inactive: 'border-transparent text-zinc-500 hover:text-zinc-300',
          refresh: 'text-zinc-500 hover:text-zinc-300',
        }
      : {
          nav: 'bg-pup-bg/95 backdrop-blur border-pup-line',
          active: 'border-pup-accent text-pup-ink',
          inactive: 'border-transparent text-pup-muted hover:text-pup-ink',
          refresh: 'text-pup-muted hover:text-pup-ink',
        }
  }
  return {
    nav: 'bg-white/95 backdrop-blur border-stone-200',
    active: 'border-stone-700 text-stone-700',
    inactive: 'border-transparent text-stone-400 hover:text-stone-600',
    refresh: 'text-stone-400 hover:text-stone-700',
  }
}

export default function TabNav() {
  const { pathname } = useLocation()
  const [night] = useNightMode()
  const t = themeFor(pathname, night)

  const base =
    'px-5 py-3 text-xs uppercase tracking-widest font-sans border-b-2 transition-colors'

  return (
    <nav className={`sticky top-0 z-20 flex items-stretch border-b ${t.nav}`}>
      <div className="flex flex-1">
        <NavLink
          to="/dashboard/home"
          className={({ isActive }) => `${base} ${isActive ? t.active : t.inactive}`}
        >
          Home
        </NavLink>
        <NavLink
          to="/dashboard/fitness"
          className={({ isActive }) => `${base} ${isActive ? t.active : t.inactive}`}
        >
          Fitness
        </NavLink>
        <NavLink
          to="/dashboard/puppy"
          className={({ isActive }) => `${base} ${isActive ? t.active : t.inactive}`}
        >
          Poppy
        </NavLink>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        aria-label="Refresh"
        title="Refresh"
        className={`flex items-center justify-center min-w-[44px] min-h-[44px] px-4 transition-colors ${t.refresh}`}
      >
        <RefreshIcon />
      </button>
    </nav>
  )
}
