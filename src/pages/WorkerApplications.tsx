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

        for (
          const cp of
            (companyRes.data as Array<{
              profile_id: string
              company_name: string | null
            }>) || []
        ) {
          if (cp.company_name) {
            companyMap.set(cp.profile_id, cp.company_name)
          }
        }

        for (
          const ep of
            (profilesRes.data as Array<{
              id: string
              full_name: string | null
            }>) || []
        ) {
          if (!companyMap.has(ep.id) && ep.full_name) {
            companyMap.set(ep.id, ep.full_name)
          }
        }

        const items: WorkerApplicationItem[] = apps.map((app) => {
          const job = jobsMap.get(app.job_id) || null

          const companyName = job?.employer_id
            ? companyMap.get(job.employer_id) || 'Employer'
            : 'Employer'

          return {
            application: app,
            job,
            companyName,
          }
        })

        setApplications(items)
      } catch (err: any) {
        setError(
          err?.message ||
            (err instanceof Error
              ? err.message
              : 'Failed to load applications')
        )
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [profile])

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <PageHeader navigate={navigate} />

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Loading your applications...
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <PageHeader navigate={navigate} />

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-error-600">{error}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const applicationCounts = {
    applied: applications.filter(
      ({ application }) => application.status === 'APPLIED'
    ).length,

    approved: applications.filter(
      ({ application }) => application.status === 'APPROVED'
    ).length,

    completed: applications.filter(
      ({ application }) => application.status === 'COMPLETED'
    ).length,
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <PageHeader navigate={navigate} />

        {/* Application Summary */}
        <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          <ApplicationSummaryCard
            label="Applied"
            value={applicationCounts.applied}
          />

          <ApplicationSummaryCard
            label="Approved"
            value={applicationCounts.approved}
          />

          <ApplicationSummaryCard
            label="Completed"
            value={applicationCounts.completed}
          />
        </div>

        {/* Applications */}
        {applications.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              📄
            </div>

            <h2 className="text-base font-semibold text-slate-900">
              No applications yet
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Start exploring available jobs and apply to the ones that match
              your skills.
            </p>

            <Link
              to="/worker/jobs"
              className="mt-5 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
            >
              Browse Available Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((item) => (
              <ApplicationCard
                key={item.application.id}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function PageHeader({
  navigate,
}: {
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="mb-6">
      <button
        onClick={() => navigate('/worker')}
        className="mb-3 text-sm font-medium text-slate-500 transition hover:text-primary-600"
      >
        ← Dashboard
      </button>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        My Applications
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Track the jobs you've applied for
      </p>
    </div>
  )
}

function ApplicationSummaryCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-4 text-center shadow-sm ring-1 ring-slate-200 sm:px-4">
      <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </p>
    </div>
  )
}

function ApplicationCard({
  item,
}: {
  item: WorkerApplicationItem
}) {
  const { application, job, companyName } = item

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return {
          label: 'Pending',
          className:
            'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
        }

      case 'APPROVED':
        return {
          label: 'Approved',
          className:
            'bg-green-50 text-green-700 ring-1 ring-green-600/20',
        }

      case 'COMPLETED':
        return {
          label: 'Completed',
          className:
            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        }

      case 'REJECTED':
        return {
          label: 'Rejected',
          className:
            'bg-red-50 text-red-700 ring-1 ring-red-600/20',
        }

      case 'SHORTLISTED':
        return {
          label: 'Shortlisted',
          className:
            'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20',
        }

      case 'INTERVIEW':
        return {
          label: 'Interview',
          className:
            'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
        }

      case 'HIRED':
        return {
          label: 'Hired',
          className:
            'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        }

      default:
        return {
          label: status,
          className:
            'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20',
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

  const formatSalary = (
    min: number | null,
    max: number | null
  ): string => {
    if (min != null && max != null) {
      return `₹${min.toLocaleString(
        'en-IN'
      )} - ₹${max.toLocaleString('en-IN')}`
    }

    if (min != null) {
      return `₹${min.toLocaleString('en-IN')}+`
    }

    if (max != null) {
      return `Up to ₹${max.toLocaleString('en-IN')}`
    }

    return 'Not specified'
  }

  const statusInfo = getStatusBadge(application.status)

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-primary-200 sm:p-5">
      {/* Top section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              {job?.title || 'Job'}
            </h3>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <p className="mt-0.5 text-sm font-medium text-slate-600">
            {companyName || 'Company'}
          </p>
        </div>

        {application.status !== 'COMPLETED' && (
          <Link
            to={`/worker/jobs/${application.job_id}`}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            View Job
          </Link>
        )}
      </div>

      {/* Job details */}
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <Detail
          label="Location"
          value={job?.location || 'Not specified'}
        />

        <Detail
          label="Salary"
          value={
            job
              ? formatSalary(job.salary_min, job.salary_max)
              : 'Not specified'
          }
        />

        <Detail
          label="Applied"
          value={formatDate(application.created_at)}
        />
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-sm text-slate-700">
        {value}
      </p>
    </div>
  )
}