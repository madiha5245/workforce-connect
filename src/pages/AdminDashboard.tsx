import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'


export function AdminDashboard() {
  const { profile } = useAuth()
  const [workerCount, setWorkerCount] = useState<number | null>(null)
  const [employerCount, setEmployerCount] = useState<number | null>(null)
  const [pendingVerifications, setPendingVerifications] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ count: workers }, { count: employers }, { count: pending }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'WORKER'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EMPLOYER'),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'PENDING'),
      ])
      setWorkerCount(workers)
      setEmployerCount(employers)
      setPendingVerifications(pending)
      setLoading(false)
    }
    load()
  }, [profile])

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Platform overview and verification queue</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Workers" value={loading ? '...' : `${workerCount ?? 0}`} />
        <StatCard label="Employers" value={loading ? '...' : `${employerCount ?? 0}`} />
        <StatCard
          label="Pending Verifications"
          value={loading ? '...' : `${pendingVerifications ?? 0}`}
          highlight={pendingVerifications != null && pendingVerifications > 0}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <AdminLink title="Manage Workers" description="View all workers and verify certifications" to="/admin/workers" />
        <AdminLink title="Manage Employers" description="View all employers on the platform" to="/admin/employers" />
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          highlight ? 'text-accent-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function AdminLink({
  title,
  description,
  to,
}: {
  title: string
  description: string
  to: string
}) {
  return (
    <a
      href={to}
      className="block rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary-300"
    >
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </a>
  )
}
