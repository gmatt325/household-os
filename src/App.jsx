import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'

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
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
