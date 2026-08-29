import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode
  allowedRoles?: UserRole[]
}) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getDashboardPath(profile.role)} replace />
  }

  return <>{children}</>
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'WORKER':
      return '/worker'
    case 'EMPLOYER':
      return '/employer'
    case 'ADMIN':
      return '/admin'
  }
}
