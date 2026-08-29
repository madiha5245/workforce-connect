import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { WorkerProfile } from '@/types'

export function WorkerDashboard() {
  const { profile } = useAuth()
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('worker_profiles')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error.message)
        setWorkerProfile(data as WorkerProfile | null)
        setLoading(false)
      })
  }, [profile])

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Worker Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {profile?.full_name ?? profile?.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Verification" value={workerProfile?.verification_status ?? 'Not set up'} />
        <StatCard label="Trust Score" value={workerProfile ? `${workerProfile.trust_score}` : '—'} />
        <StatCard
          label="Rating"
          value={workerProfile ? `${workerProfile.rating} (${workerProfile.rating_count})` : '—'}
        />
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Your Profile</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : workerProfile ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Skills" value={workerProfile.skills?.join(', ') ?? 'Not set'} />
            <Field
              label="Experience"
              value={
                workerProfile.years_of_experience != null
                  ? `${workerProfile.years_of_experience} years`
                  : 'Not set'
              }
            />
            <Field label="Location" value={workerProfile.location ?? 'Not set'} />
            <Field label="Availability" value={workerProfile.availability ?? 'Not set'} />
            <Field
              label="Expected Salary"
              value={
                workerProfile.expected_salary != null
                  ? `₹${workerProfile.expected_salary.toLocaleString('en-IN')}/mo`
                  : 'Not set'
              }
            />
            <Field
              label="Certifications"
              value={
                workerProfile.certifications
                  ? (workerProfile.certifications as Array<{ name: string }>)
                      .map((c) => c.name)
                      .join(', ')
                  : 'None'
              }
            />
          </dl>
        ) : (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              You haven't set up your worker profile yet.
            </p>
            <Link
              to="/worker/profile"
              className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Create your profile
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <QuickLink title="Browse Jobs" description="Find jobs that match your skills" to="/worker/jobs" />
        <QuickLink
          title="My Applications"
          description="Track the status of your job applications"
          to="/worker/applications"
        />
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  )
}

function QuickLink({
  title,
  description,
  to,
}: {
  title: string
  description: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary-300"
    >
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  )
}
