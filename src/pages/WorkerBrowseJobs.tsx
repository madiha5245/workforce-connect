import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Job } from '@/types'

export function WorkerBrowseJobs() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    async function fetchJobs() {
      if (!profile) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setJobs((data as Job[]) || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [profile])

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase().trim()
    const location = locationFilter.toLowerCase().trim()

    const matchesSearch =
      !query ||
      job.title.toLowerCase().includes(query) ||
      job.description?.toLowerCase().includes(query) ||
      job.required_skills?.some((skill) =>
        skill.toLowerCase().includes(query)
      )

    const matchesLocation =
      !location ||
      job.location?.toLowerCase().includes(location)

    return matchesSearch && matchesLocation
  })

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Browse Jobs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Find work that matches your skills
          </p>
        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Search
              </label>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job title, skill, or keyword..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Location
              </label>

              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Hyderabad, Bangalore..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading jobs...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredJobs.length === 0 && !error && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">
              {jobs.length === 0
                ? 'No active jobs available'
                : 'No jobs found'}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {jobs.length === 0
                ? 'Check back later for new opportunities.'
                : 'Try changing your search or location filter.'}
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && filteredJobs.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                {filteredJobs.length}{' '}
                {filteredJobs.length === 1 ? 'job' : 'jobs'} available
              </p>

              {(searchQuery || locationFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setLocationFilter('')
                  }}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

function JobCard({ job }: { job: Job }) {
  const formatSalary = (
    min: number | null,
    max: number | null
  ): string => {
    if (min && max) {
      return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString(
        'en-IN'
      )}`
    }

    if (min) {
      return `₹${min.toLocaleString('en-IN')}+`
    }

    if (max) {
      return `Up to ₹${max.toLocaleString('en-IN')}`
    }

    return 'Salary not specified'
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition duration-150 hover:border-primary-200 hover:shadow-md sm:px-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {job.title}
          </h3>

          <p className="mt-0.5 text-xs text-slate-400">
            Posted {formatDate(job.created_at)}
          </p>
        </div>

        {job.job_type && (
          <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700">
            {job.job_type}
          </span>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p className="mt-2 text-sm leading-5 text-slate-600 line-clamp-2">
          {job.description}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-100 py-3">
        {job.location && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Location
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-700">
              {job.location}
            </p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Salary
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            {formatSalary(job.salary_min, job.salary_max)}
          </p>
        </div>
      </div>

      {/* Skills + Action */}
      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
        {job.required_skills && job.required_skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {job.required_skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {skill}
              </span>
            ))}

            {job.required_skills.length > 5 && (
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-400">
                +{job.required_skills.length - 5} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            No specific skills listed
          </span>
        )}

        <Link
          to={`/worker/jobs/${job.id}`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-700"
        >
          View Details
          <span className="ml-1">→</span>
        </Link>
      </div>
    </div>
  )
}