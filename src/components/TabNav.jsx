import { NavLink, useLocation } from 'react-router-dom'

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

  return (
    <nav
      className={`sticky top-0 z-20 flex border-b ${
        dark
          ? 'bg-zinc-950 border-zinc-800'
          : 'bg-white/95 backdrop-blur border-stone-200'
      }`}
    >
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
    </nav>
  )
}
