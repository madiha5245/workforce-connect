import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Application, Job } from '@/types'

interface WorkerApplicationItem {
  application: Application
  job: Job | null
  companyName: string | null
}

export function WorkerApplicationsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<WorkerApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }

    async function loadApplications() {
      if (!profile) return
      setLoading(true)
      setError(null)

      try {
        // Fetch applications submitted by the logged-in worker
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select('*')
          .eq('worker_id', profile.id)
          .order('created_at', { ascending: false })

        if (appsError) throw appsError

        const apps = (appsData as Application[]) || []

        if (apps.length === 0) {
          setApplications([])
          return
        }

        // Fetch related jobs
        const jobIds = Array.from(new Set(apps.map((a) => a.job_id)))
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .in('id', jobIds)

        if (jobsError) throw jobsError

        const jobsMap = new Map<string, Job>()
        const employerIds: string[] = []
        for (const j of (jobsData as Job[]) || []) {
          jobsMap.set(j.id, j)
          if (j.employer_id && !employerIds.includes(j.employer_id)) {
            employerIds.push(j.employer_id)
          }
        }

        // Fetch employer company profiles and names
        const [companyRes, profilesRes] = await Promise.all([
          employerIds.length > 0
            ? supabase
                .from('company_profiles')
                .select('profile_id, company_name')
                .in('profile_id', employerIds)
            : Promise.resolve({ data: [] }),
          employerIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', employerIds)
            : Promise.resolve({ data: [] }),
        ])

        const companyMap = new Map<string, string>()
        for (const cp of (companyRes.data as Array<{ profile_id: string; company_name: string | null }>) || []) {
          if (cp.company_name) companyMap.set(cp.profile_id, cp.company_name)
        }
        for (const ep of (profilesRes.data as Array<{ id: string; full_name: string | null }>) || []) {
          if (!companyMap.has(ep.id) && ep.full_name) {
            companyMap.set(ep.id, ep.full_name)
          }
        }

        const items: WorkerApplicationItem[] = apps.map((app) => {
          const job = jobsMap.get(app.job_id) || null
          const companyName = job?.employer_id ? companyMap.get(job.employer_id) || 'Employer' : 'Employer'
          return {
            application: app,
            job,
            companyName,
          }
        })

        setApplications(items)
      } catch (err: any) {
        setError(err?.message || (err instanceof Error ? err.message : 'Failed to load applications'))
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [profile])

  if (loading) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/worker')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Loading your applications...</p>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/worker')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      </AppLayout>
    )
  }

  const applicationCounts = {
    applied: applications.filter(({ application }) => application.status === 'APPLIED').length,
    approved: applications.filter(({ application }) => application.status === 'APPROVED').length,
    completed: applications.filter(({ application }) => application.status === 'COMPLETED').length,
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <button
          onClick={() => navigate('/worker')}
          className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and manage your submitted job applications
        </p>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <ApplicationSummaryCard label="Applied" value={applicationCounts.applied} />
        <ApplicationSummaryCard label="Approved" value={applicationCounts.approved} />
        <ApplicationSummaryCard label="Completed" value={applicationCounts.completed} />
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">You have not applied to any jobs yet.</p>
          <Link
            to="/worker/jobs"
            className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Browse Available Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((item) => (
            <ApplicationCard key={item.application.id} item={item} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function ApplicationSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function ApplicationCard({ item }: { item: WorkerApplicationItem }) {
  const { application, job, companyName } = item

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return {
          label: 'Pending',
          className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
        }
      case 'APPROVED':
        return {
          label: 'Approved',
          className: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
        }
      case 'COMPLETED':
        return {
          label: 'Completed',
          className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        }
      case 'REJECTED':
        return {
          label: 'Rejected',
          className: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
        }
      case 'SHORTLISTED':
        return {
          label: 'Shortlisted',
          className: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
        }
      case 'INTERVIEW':
        return {
          label: 'Interview',
          className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
        }
      case 'HIRED':
        return {
          label: 'Hired',
          className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        }
      default:
        return {
          label: status,
          className: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20',
        }
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const statusInfo = getStatusBadge(application.status)

  const formatSalary = (min: number | null, max: number | null): string => {
    if (min != null && max != null) {
      return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`
    }
    if (min != null) return `₹${min.toLocaleString('en-IN')}+`
    if (max != null) return `Up to ₹${max.toLocaleString('en-IN')}`
    return 'Not specified'
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {job?.title || 'Job'}
          </h3>
          <p className="text-sm font-medium text-slate-600">
            {companyName || 'Company'}
          </p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <p className="text-slate-600">
              <span className="font-medium text-slate-700">Location:</span> {job?.location || 'Not specified'}
            </p>
            <p className="text-slate-600">
              <span className="font-medium text-slate-700">Salary:</span>{' '}
              {job ? formatSalary(job.salary_min, job.salary_max) : 'Not specified'}
            </p>
            <p className="text-slate-600">
              <span className="font-medium text-slate-700">Applied:</span> {formatDate(application.created_at)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-500">Status:</span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>
        {application.status !== 'COMPLETED' && (
          <div>
            <Link
              to={`/worker/jobs/${application.job_id}`}
              className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
            >
              View Job Details
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
