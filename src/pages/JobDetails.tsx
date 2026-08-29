import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Job, Application } from '@/types'

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userApplication, setUserApplication] = useState<Application | null>(null)
  const [checkingApplication, setCheckingApplication] = useState(false)

  useEffect(() => {
    if (!id || !profile) {
      setLoading(false)
      return
    }

    async function fetchJobAndApplication() {
      setLoading(true)
      setError(null)
      try {
        // Fetch the job
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .maybeSingle()

        if (jobError) throw jobError

        if (!jobData) {
          setError('Job not found')
          setJob(null)
          return
        }

        if (!jobData.is_active) {
          setError('This job is no longer active')
          setJob(jobData as Job)
          return
        }

        setJob(jobData as Job)

        // Check if user has already applied
        setCheckingApplication(true)
        if (!profile) {
          setCheckingApplication(false)
          return
        }
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', id)
          .eq('worker_id', profile.id)
          .maybeSingle()

        if (appError) {
          console.error('Error checking application:', appError)
        } else if (appData) {
          setUserApplication(appData as Application)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job details')
        setJob(null)
      } finally {
        setLoading(false)
        setCheckingApplication(false)
      }
    }

    fetchJobAndApplication()
  }, [id, profile])

  async function handleApply() {
    if (!profile || !job) return

    setApplying(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('applications').insert([
        {
          job_id: job.id,
          worker_id: profile.id,
          status: 'APPLIED',
        },
      ])

      if (error) {
        // Check if it's a unique constraint violation
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          setMessage({
            type: 'error',
            text: 'You have already applied for this job',
          })
          // Refresh the application data
          const { data: appData } = await supabase
            .from('applications')
            .select('*')
            .eq('job_id', job.id)
            .eq('worker_id', profile.id)
            .maybeSingle()
          if (appData) {
            setUserApplication(appData as Application)
          }
        } else {
          throw error
        }
      } else {
        setMessage({
          type: 'success',
          text: 'Successfully applied for this job!',
        })
        // Refresh the application data
        const { data: appData } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', job.id)
          .eq('worker_id', profile.id)
          .maybeSingle()
        if (appData) {
          setUserApplication(appData as Application)
        }
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to apply for job',
      })
    } finally {
      setApplying(false)
    }
  }

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
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/worker/jobs')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Jobs
          </button>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Loading job details...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !job) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/worker/jobs')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Jobs
          </button>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-error-600">{error || 'Job not found'}</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <button
          onClick={() => navigate('/worker/jobs')}
          className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Jobs
        </button>
        <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Posted {formatDate(job.created_at)}</p>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-error-50 text-error-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Job Overview */}
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {job.location && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">Location</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{job.location}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Salary</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {formatSalary(job.salary_min, job.salary_max)}
                </p>
              </div>
              {job.job_type && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">Employment Type</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{job.job_type}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">About this job</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{job.description}</p>
            </div>
          )}

          {/* Required Skills */}
          {job.required_skills && job.required_skills.length > 0 && (
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-block rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="sticky top-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {checkingApplication ? (
              <p className="text-sm text-slate-500">Checking application status...</p>
            ) : userApplication ? (
              <div>
                {userApplication.status === 'APPROVED' ? (
                  <div>
                    <div className="mb-4 rounded-lg bg-green-50 px-3 py-2">
                      <p className="text-sm font-medium text-green-700">
                        ✓ Application Approved
                      </p>
                      <p className="mt-2 text-xs text-green-600">
                        The employer has approved your application. You can now proceed to the next stage.
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full rounded-lg bg-green-100 px-4 py-2.5 font-medium text-green-700"
                    >
                      Application Approved
                    </button>
                  </div>
                ) : userApplication.status === 'DISCUSSION' ? (
                  <div>
                    <div className="mb-4 rounded-lg bg-indigo-50 px-3 py-2">
                      <p className="text-sm font-medium text-indigo-700">
                        ✓ Discussion Started
                      </p>
                      <p className="mt-2 text-xs text-indigo-600">
                        The employer has approved your application and is ready to discuss the work and terms with you.
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full rounded-lg bg-indigo-100 px-4 py-2.5 font-medium text-indigo-700"
                    >
                      Discussion Started
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2">
                      <p className="text-sm font-medium text-blue-700">
                        ✓ You have already applied
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        Status: {userApplication.status}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        Applied {formatDate(userApplication.created_at)}
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full rounded-lg bg-slate-100 px-4 py-2.5 font-medium text-slate-500"
                    >
                      Already Applied
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
