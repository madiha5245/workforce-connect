import { useAuth } from '@/context/AuthContext'
import { getDashboardPath } from '@/components/ProtectedRoute'
import { Navigate } from 'react-router-dom'

export function HomePage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={getDashboardPath(profile.role)} replace />
}
