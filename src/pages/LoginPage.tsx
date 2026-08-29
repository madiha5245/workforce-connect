import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getDashboardPath } from '@/components/ProtectedRoute'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const profile = await signIn(email, password)
      navigate(getDashboardPath(profile.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary-700">Workforce Connect</h1>
          <p className="mt-1 text-sm text-slate-500">India's blue-collar recruitment platform</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-6 text-xl font-semibold text-slate-900">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
