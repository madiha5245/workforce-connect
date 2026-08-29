import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { CompanyProfile, Job } from '@/types'

export function EmployerDashboard() {
  const { profile } = useAuth()
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const profileId = profile.id
    async function load() {
      const [{ data: companyData }, { data: jobsData }] = await Promise.all([
        supabase
          .from('company_profiles')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle(),
        supabase.from('jobs').select('*').eq('employer_id', profileId).order('created_at', { ascending: false }),
      ])
      setCompany(companyData as CompanyProfile | null)
      setJobs((jobsData as Job[]) ?? [])
      setLoading(false)
    }
    load()
  }, [profile])

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Employer Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {company?.company_name ?? profile?.full_name ?? profile?.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Posted Jobs" value={loading ? '...' : `${jobs.length}`} />
        <StatCard label="Active Jobs" value={loading ? '...' : `${jobs.filter((j) => j.is_active).length}`} />
        <StatCard label="Company Profile" value={company ? 'Complete' : 'Not set up'} />
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Company Information</h2>
          <Link
            to="/employer/profile"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Edit profile
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : company ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Company Name" value={company.company_name ?? 'Not set'} />
            <Field label="Industry" value={company.industry ?? 'Not set'} />
            <Field label="Location" value={company.location ?? 'Not set'} />
            <Field label="Website" value={company.website ? (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                {company.website}
              </a>
            ) : 'Not set'} />
            {company.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-900">{company.description}</dd>
              </div>
            )}
          </dl>
        ) : (
          <div>
            <p className="mb-4 text-sm text-slate-500">
              You haven't set up your company profile yet.
            </p>
            <Link
              to="/employer/profile"
              className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Create company profile
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your Job Posts</h2>
          <Link
            to="/employer/jobs/new"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Post a job
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No jobs posted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-slate-900">{job.title}</p>
                  <p className="text-sm text-slate-500">
                    {job.location ?? 'No location'} · {job.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Link
                  to={`/employer/jobs/${job.id}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  View applicants
                </Link>
              </div>
            ))}
          </div>
        )}
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

function Field({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  )
}
