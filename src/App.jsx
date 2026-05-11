import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AppShell from './components/AppShell.jsx'
import FitnessLayout from './fitness/FitnessLayout.jsx'
import Today from './fitness/pages/Today.jsx'
import LiftingLog from './fitness/pages/LiftingLog.jsx'
import PelotonLog from './fitness/pages/PelotonLog.jsx'
import WeekViewer from './fitness/pages/WeekViewer.jsx'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullscreenSpinner />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullscreenSpinner />
  if (session) return <Navigate to="/dashboard" replace />
  return children
}

function FullscreenSpinner() {
  return (
    <div className="flex h-full items-center justify-center text-stone-500 text-sm tracking-widest uppercase">
      Loading
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="fitness" element={<FitnessLayout />}>
          <Route index element={<Today />} />
          <Route path="lift" element={<LiftingLog />} />
          <Route path="peloton" element={<PelotonLog />} />
          <Route path="week" element={<WeekViewer />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
