import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="min-w-0 text-base font-bold tracking-tight text-primary-700 sm:text-lg">
            Workforce <span className="text-slate-900">Connect</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {profile && (
              <>
                <span className="hidden truncate text-sm text-slate-600 sm:block">
                  {profile.full_name ?? profile.email}
                  <span className="ml-2 rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                    {profile.role}
                  </span>
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-3 sm:text-sm"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
