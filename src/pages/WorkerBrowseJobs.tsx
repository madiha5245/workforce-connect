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

  // Filter jobs based on search query and location
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.required_skills?.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesLocation =
      !locationFilter ||
      job.location?.toLowerCase().includes(locationFilter.toLowerCase())

    return matchesSearch && matchesLocation
  })

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Browse Jobs</h1>
        <p className="mt-1 text-sm text-slate-500">Find jobs that match your skills</p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Search Jobs</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or skills..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Filter by Location
            </label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="e.g., Mumbai, Bangalore..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Loading jobs...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && !error && (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            {jobs.length === 0 ? 'No active jobs available right now.' : 'No jobs match your search.'}
          </p>
        </div>
      )}

      {/* Jobs List */}
      {!loading && filteredJobs.length > 0 && (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function JobCard({ job }: { job: Job }) {
  const formatSalary = (min: number | null, max: number | null): string => {
    if (min && max) {
      return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`
    }
    if (min) return `₹${min.toLocaleString('en-IN')}+`
    if (max) return `Up to ₹${max.toLocaleString('en-IN')}`
    return 'Salary not specified'
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:ring-primary-300">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
          <p className="mt-1 text-sm text-slate-500">Posted {formatDate(job.created_at)}</p>
        </div>
        {job.job_type && (
          <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            {job.job_type}
          </span>
        )}
      </div>

      {job.description && (
        <p className="mb-4 text-sm text-slate-600 line-clamp-2">{job.description}</p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {job.location && (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Location</p>
            <p className="mt-1 text-sm text-slate-900">{job.location}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase text-slate-400">Salary</p>
          <p className="mt-1 text-sm text-slate-900">{formatSalary(job.salary_min, job.salary_max)}</p>
        </div>
      </div>

      {job.required_skills && job.required_skills.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase text-slate-400">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {job.required_skills.map((skill) => (
              <span
                key={skill}
                className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        to={`/worker/jobs/${job.id}`}
        className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        View Details
      </Link>
    </div>
  )
}
