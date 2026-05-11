import { Outlet } from 'react-router-dom'
import TabNav from './TabNav.jsx'

export default function AppShell() {
  return (
    <div className="min-h-full">
      <TabNav />
      <Outlet />
    </div>
  )
}
