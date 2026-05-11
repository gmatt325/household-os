import { Outlet } from 'react-router-dom'
import MetricsBanner from './components/MetricsBanner.jsx'

export default function FitnessLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <MetricsBanner />
      <div className="w-full max-w-md mx-auto px-4 md:max-w-3xl md:px-8">
        <Outlet />
      </div>
    </div>
  )
}
