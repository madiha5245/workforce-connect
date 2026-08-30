import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Job, Application } from '@/types'

interface EmployerContactInfo {
  companyName: string | null
  phone: string | null
  email: string | null
}

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [userApplication, setUserApplication] =
    useState<Application | null>(null)
  const [employerContact, setEmployerContact] =
    useState<EmployerContactInfo | null>(null)
  const [checkingApplication, setCheckingApplication] = useState(false)

  useEffect(() => {
  if (!id || !profile) {
    setLoading(false)
    return
  }

  const currentProfile = profile

  async function fetchJobAndApplication() {
    setLoading(true)
    setError(null)

    try {
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

      const jobRecord = jobData as Job
      setJob(jobRecord)

      // Check whether this worker already applied
      setCheckingApplication(true)

      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', id)
        .eq('worker_id', currentProfile.id)
        .maybeSingle()

      if (appError) {
        console.error('Error checking application:', appError)
      } else if (appData) {
        const app = appData as Application
        setUserApplication(app)

        // If approved, fetch employer contact details
        if (app.status === 'APPROVED' && jobRecord.employer_id) {
          const [{ data: empProf }, { data: compProf }] = await Promise.all([
            supabase
              .from('profiles')
              .select('email, phone')
              .eq('id', jobRecord.employer_id)
              .maybeSingle(),

            supabase
              .from('company_profiles')
              .select('company_name')
              .eq('profile_id', jobRecord.employer_id)
              .maybeSingle(),
          ])

          setEmployerContact({
            companyName: compProf?.company_name || null,
            phone: empProf?.phone || null,
            email: empProf?.email || null,
          })
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load job details'
      )
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
        if (
          error.message.includes('duplicate') ||
          error.message.includes('unique')
        ) {
          setMessage({
            type: 'error',
            text: 'You have already applied for this job',
          })

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
        text:
          err instanceof Error
            ? err.message
            : 'Failed to apply for job',
      })
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = (
    min: number | null,
    max: number | null
  ): string => {
    if (min != null && max != null) {
      return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString(
        'en-IN'
      )}`
    }

    if (min != null) {
      return `₹${min.toLocaleString('en-IN')}+`
    }

    if (max != null) {
      return `Up to ₹${max.toLocaleString('en-IN')}`
    }

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

  // Loading
  if (loading) {
    return (
      <AppLayout>
        <div className="mb-6">
          <button
            onClick={() => navigate('/worker/jobs')}
            className="mb-3 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Jobs
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Job Details
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            Loading job details...
          </p>
        </div>
      </AppLayout>
    )
  }

  // Error
  if (error || !job) {
    return (
      <AppLayout>
        <div className="mb-6">
          <button
            onClick={() => navigate('/worker/jobs')}
            className="mb-3 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Jobs
          </button>

          <h1 className="text-2xl font-bold text-slate-900">
            Job Details
          </h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-error-600">
            {error || 'Job not found'}
          </p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/worker/jobs')}
          className="mb-3 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Jobs
        </button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {job.title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Posted {formatDate(job.created_at)}
            </p>
          </div>

          {job.job_type && (
            <span className="w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {job.job_type}
            </span>
          )}
        </div>
      </div>

      {/* Message */}
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

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-5 lg:col-span-2">

          {/* Job Overview */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Job Overview
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {job.location && (
                <InfoItem
                  label="Location"
                  value={job.location}
                />
              )}

              <InfoItem
                label="Salary"
                value={formatSalary(
                  job.salary_min,
                  job.salary_max
                )}
              />

              {job.job_type && (
                <InfoItem
                  label="Employment Type"
                  value={job.job_type}
                />
              )}
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                About this job
              </h2>

              <p className="whitespace-pre-line text-sm leading-6 text-slate-600">
                {job.description}
              </p>
            </div>
          )}

          {/* Required Skills */}
          {job.required_skills &&
            job.required_skills.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-3 text-base font-semibold text-slate-900">
                  Required Skills
                </h2>

                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700"
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
          <div className="sticky top-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Application
            </h2>

            {/* Checking */}
            {checkingApplication && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-500">
                  Checking application status...
                </p>
              </div>
            )}

            {/* Existing Application */}
            {!checkingApplication && userApplication && (
              <>
                {userApplication.status === 'APPROVED' ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                          ✓
                        </span>

                        <p className="text-sm font-semibold text-green-700">
                          Application Approved
                        </p>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-600">
                        The employer has approved your application.
                        You can now contact the employer to discuss
                        the work.
                      </p>
                    </div>

                    {/* Employer Contact */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employer Contact
                      </p>

                      <div className="space-y-3">
                        <ContactItem
                          label="Company"
                          value={
                            employerContact?.companyName ||
                            'Not specified'
                          }
                        />

                        <ContactItem
                          label="Phone"
                          value={
                            employerContact?.phone ||
                            'Not specified'
                          }
                        />

                        <ContactItem
                          label="Email"
                          value={
                            employerContact?.email ||
                            'Not specified'
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          ✓
                        </span>

                        <p className="text-sm font-semibold text-blue-700">
                          Application Submitted
                        </p>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-blue-700">
                        <p>
                          <span className="font-medium">
                            Status:
                          </span>{' '}
                          {userApplication.status}
                        </p>

                        <p>
                          <span className="font-medium">
                            Applied:
                          </span>{' '}
                          {formatDate(
                            userApplication.created_at
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled
                      className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500"
                    >
                      Already Applied
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Apply */}
            {!checkingApplication && !userApplication && (
              <div>
                <p className="mb-4 text-sm leading-5 text-slate-500">
                  Interested in this job? Submit your application
                  to the employer.
                </p>

                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? 'Applying...' : 'Apply Now'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

/* -----------------------------
   Small reusable UI components
----------------------------- */

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  )
}

function ContactItem({
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

      <p className="mt-0.5 break-words text-sm text-slate-700">
        {value}
      </p>
    </div>
  )
}