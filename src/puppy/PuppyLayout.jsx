import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useNightMode } from './lib/nightMode.js'

export default function PuppyLayout() {
  const [night] = useNightMode()

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = night ? '#161210' : '#FBF4EA'
    return () => { document.body.style.background = prev }
  }, [night])

  return (
    <div className={`min-h-screen overflow-x-hidden ${night ? 'bg-pup-nightbg text-pup-nightink' : 'bg-pup-bg text-pup-ink'}`}>
      <div className="w-full max-w-md mx-auto px-4 md:max-w-2xl md:px-6">
        <Outlet />
      </div>
    </div>
  )
}
