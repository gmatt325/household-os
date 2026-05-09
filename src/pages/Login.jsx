import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error.message)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-full flex items-center justify-center px-6 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white/60 backdrop-blur rounded-2xl p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
      >
        <h1 className="font-serif font-light text-3xl uppercase tracking-[2px] text-stone-700 text-center mb-8">
          Household
        </h1>
        <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-stone-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-stone-400"
          autoComplete="email"
        />
        <label className="block text-xs uppercase tracking-widest text-stone-500 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg border border-stone-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-stone-400"
          autoComplete="current-password"
        />
        {error && (
          <p className="text-sm text-red-600 mb-4" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-stone-700 text-white text-sm uppercase tracking-widest hover:bg-stone-800 transition disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
