import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type {
  Job,
  Application,
  Profile,
  WorkerProfile,
  Certification,
} from '@/types'

interface ApplicantData {
  application: Application
  workerProfile: WorkerProfile | null
  profile: Profile | null
}

export function EmployerApplicantsPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile: currentProfile } = useAuth()

  const [job, setJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<ApplicantData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId || !currentProfile) {
      setLoading(false)
      return
    }

    async function loadData() {
      if (!currentProfile) return
      setLoading(true)
      setError(null)

      try {
        // Fetch job
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle()

        if (jobError) throw jobError

        if (!jobData) {
          setError('Job not found')
          setJob(null)
          return
        }

        const jobRecord = jobData as Job

        // Verify employer owns the job
        if (jobRecord.employer_id !== currentProfile.id) {
          setError('You do not have permission to view applicants for this job')
          setJob(jobRecord)
          return
        }

        setJob(jobRecord)

        // Fetch applications
        const { data: applicationsData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })

        if (appError) throw appError

        const applications = (applicationsData as Application[]) || []

        const applicantDataList: ApplicantData[] = []

        // Fetch worker information
        for (const app of applications) {
          try {
            const [{ data: workerProfileData }, { data: profileData }] =
              await Promise.all([
                supabase
                  .from('worker_profiles')
                  .select('*')
                  .eq('profile_id', app.worker_id)
                  .maybeSingle(),

                supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', app.worker_id)
                  .maybeSingle(),
              ])

            applicantDataList.push({
              application: app,
              workerProfile: (workerProfileData as WorkerProfile) || null,
              profile: (profileData as Profile) || null,
            })
          } catch (err) {
            console.error('Error fetching applicant data:', err)

            applicantDataList.push({
              application: app,
              workerProfile: null,
              profile: null,
            })
          }
        }

        setApplicants(applicantDataList)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load applicants'
        )
        setJob(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [jobId, currentProfile])

  if (loading) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/employer')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Loading applicants...</p>
        </div>
      </AppLayout>
    )
  }

  if (error || !job) {
    return (
      <AppLayout>
        <div className="mb-8">
          <button
            onClick={() => navigate('/employer')}
            className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Back to Dashboard
          </button>
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
      {/* PAGE HEADER */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/employer')}
          className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-slate-900">
          Applicants for {job.title}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {applicants.length} application
          {applicants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* EMPTY STATE */}
      {applicants.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <span className="text-xl">👤</span>
          </div>

          <p className="text-sm font-medium text-slate-700">
            No applications yet
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Applications for this job will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.application.id}
              applicant={applicant}
              onApprovalStatusChange={(updatedApp) => {
                setApplicants((prev) =>
                  prev.map((app) =>
                    app.application.id === updatedApp.id
                      ? {
                          ...app,
                          application: updatedApp,
                        }
                      : app
                  )
                )
              }}
            />
          ))}
        </div>
      )}
    </AppLayout>
  )
}

/* =========================================================
   APPLICANT CARD
========================================================= */

function ApplicantCard({
  applicant,
  onApprovalStatusChange,
}: {
  applicant: ApplicantData
  onApprovalStatusChange: (updatedApp: Application) => void
}) {
  const { application, workerProfile, profile } = applicant

  const [approving, setApproving] = useState(false)

  const [approvalMessage, setApprovalMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [submittingCompletion, setSubmittingCompletion] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [completionComment, setCompletionComment] = useState('')

  const [completionRatings, setCompletionRatings] = useState({
    work_quality: 0,
    professionalism: 0,
    punctuality: 0,
    responsiveness: 0,
    behaviour: 0,
  })

  /* ---------------------------------------------------------
     APPROVE APPLICATION
  --------------------------------------------------------- */

  async function handleApprove() {
    setApproving(true)
    setApprovalMessage(null)

    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          status: 'APPROVED',
        })
        .eq('id', application.id)
        .select()
        .single()

      if (error) throw error

      setApprovalMessage({
        type: 'success',
        text: 'Application approved successfully.',
      })

      if (data) {
        onApprovalStatusChange(data as Application)
      }

      setTimeout(() => setApprovalMessage(null), 3000)
    } catch (err) {
      setApprovalMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Failed to approve application',
      })
    } finally {
      setApproving(false)
    }
  }

  /* ---------------------------------------------------------
     COMPLETION DIALOG
  --------------------------------------------------------- */

  function openCompletionDialog() {
    setCompletionRatings({
      work_quality: 0,
      professionalism: 0,
      punctuality: 0,
      responsiveness: 0,
      behaviour: 0,
    })

    setCompletionComment('')
    setCompletionError(null)
    setShowCompletionDialog(true)
  }

  async function handleCompleteAndSubmit() {
    if (
      Object.values(completionRatings).some(
        (rating) => rating < 1 || rating > 5
      )
    ) {
      setCompletionError('Please provide all five ratings.')
      return
    }

    setSubmittingCompletion(true)
    setCompletionError(null)

    try {
      const { error } = await supabase.rpc(
        'complete_and_rate_application',
        {
          p_application_id: application.id,
          p_work_quality: completionRatings.work_quality,
          p_professionalism: completionRatings.professionalism,
          p_punctuality: completionRatings.punctuality,
          p_responsiveness: completionRatings.responsiveness,
          p_behaviour: completionRatings.behaviour,
          p_review: completionComment.trim() || null,
        }
      )

      if (error) throw error

      onApprovalStatusChange({
        ...application,
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })

      setShowCompletionDialog(false)

      setApprovalMessage({
        type: 'success',
        text: 'Work completed and rating submitted successfully.',
      })

      setTimeout(() => setApprovalMessage(null), 3000)
    } catch (err) {
      setCompletionError(getSupabaseErrorMessage(err))
    } finally {
      setSubmittingCompletion(false)
    }
  }

  const statusInfo = getStatusInfo(application.status)

  return (
    <>
      {/* MAIN APPLICANT CARD */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {/* SUCCESS / ERROR MESSAGE */}
        {approvalMessage && (
          <div
            className={`border-b px-6 py-3 text-sm ${
              approvalMessage.type === 'success'
                ? 'border-green-100 bg-green-50 text-green-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {approvalMessage.text}
          </div>
        )}

        {/* HEADER */}
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {profile?.full_name || 'Unknown Worker'}
              </h3>

              <div className="mt-2 space-y-1">
                {profile?.email && (
                  <p className="text-sm text-slate-500">
                    {profile.email}
                  </p>
                )}

                {profile?.phone ? (
                  <p className="text-sm text-slate-500">
                    {profile.phone}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400">
                    No phone number provided
                  </p>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Applied {formatDate(application.created_at)}
              </p>
            </div>

            {/* STATUS + ACTION */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>

              {application.status === 'APPLIED' && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve'}
                </button>
              )}

              {application.status === 'APPROVED' && (
                <button
                  onClick={openCompletionDialog}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
                >
                  Mark Work Done
                </button>
              )}
            </div>
          </div>
        </div>

        {/* WORKER INFORMATION */}
        <div className="border-b border-slate-100 p-6">
          <SectionTitle title="Worker Information" />

          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem
              label="Location"
              value={workerProfile?.location || 'Not specified'}
            />

            <InfoItem
              label="Experience"
              value={
                workerProfile?.years_of_experience != null
                  ? `${workerProfile.years_of_experience} years`
                  : 'Not specified'
              }
            />

            <InfoItem
              label="Verification"
              value={
                workerProfile?.verification_status || 'Not specified'
              }
            />

            <InfoItem
              label="Profile Rating"
              value={
                workerProfile?.rating != null
                  ? `${formatRating(workerProfile.rating)} / 5`
                  : 'No rating'
              }
            />
          </div>
        </div>

        {/* SKILLS */}
        <div className="border-b border-slate-100 p-6">
          <SectionTitle title="Skills" />

          {workerProfile?.skills && workerProfile.skills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {workerProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No skills listed.
            </p>
          )}
        </div>

        {/* CERTIFICATIONS */}
        <div className="border-b border-slate-100 p-6">
          <SectionTitle title="Certifications" />

          {workerProfile?.certifications &&
          workerProfile.certifications.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(workerProfile.certifications as Certification[]).map(
                (cert) => (
                  <div
                    key={cert.name}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {cert.name}
                    </p>

                    {(cert.issuer || cert.year) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {cert.issuer || ''}
                        {cert.issuer && cert.year ? ' • ' : ''}
                        {cert.year || ''}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No certifications listed.
            </p>
          )}
        </div>

        {/* =====================================================
            RATINGS SECTION
        ===================================================== */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SectionTitle title="Ratings & Performance" />

              <p className="mt-1 text-xs text-slate-500">
                Previous performance ratings from completed jobs
              </p>
            </div>

            {workerProfile?.rating != null && (
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200">
                <span className="text-lg text-amber-400">★</span>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRating(workerProfile.rating)} / 5
                  </p>

                  <p className="text-xs text-slate-500">
                    {workerProfile.rating_count || 0} reviews
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RATING GRID */}
          {workerProfile ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <PerformanceRating
                label="Work Quality"
                value={workerProfile.work_quality_rating}
              />

              <PerformanceRating
                label="Professionalism"
                value={workerProfile.professionalism_rating}
              />

              <PerformanceRating
                label="Punctuality"
                value={workerProfile.punctuality_rating}
              />

              <PerformanceRating
                label="Responsiveness"
                value={workerProfile.responsiveness_rating}
              />

              <PerformanceRating
                label="Behaviour"
                value={workerProfile.behaviour_rating}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-white p-5 text-center ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                No rating information available.
              </p>
            </div>
          )}
        </div>

        {/* COVER NOTE */}
        {application.cover_note && (
          <div className="p-6">
            <SectionTitle title="Cover Note" />

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {application.cover_note}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* COMPLETION DIALOG */}
      {showCompletionDialog && (
        <CompletionDialog
          applicationId={application.id}
          ratings={completionRatings}
          comment={completionComment}
          error={completionError}
          submitting={submittingCompletion}
          onRatingChange={(field, value) => {
            setCompletionRatings((current) => ({
              ...current,
              [field]: value,
            }))
          }}
          onCommentChange={setCompletionComment}
          onCancel={() => setShowCompletionDialog(false)}
          onSubmit={handleCompleteAndSubmit}
        />
      )}
    </>
  )
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
      {title}
    </h4>
  )
}

/* =========================================================
   INFO ITEM
========================================================= */

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

      <p className="mt-1.5 text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  )
}

/* =========================================================
   PERFORMANCE RATING
========================================================= */

function PerformanceRating({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const rating = Number(value)

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-base font-semibold text-slate-900">
          {formatRating(rating)}
        </span>

        <span className="text-sm text-amber-400">
          ★
        </span>
      </div>

      {/* Small visual rating bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{
            width: `${Math.min(Math.max(rating, 0), 5) * 20}%`,
          }}
        />
      </div>

      <p className="mt-1 text-[11px] text-slate-400">
        out of 5
      </p>
    </div>
  )
}

/* =========================================================
   COMPLETION DIALOG
========================================================= */

function CompletionDialog({
  applicationId,
  ratings,
  comment,
  error,
  submitting,
  onRatingChange,
  onCommentChange,
  onCancel,
  onSubmit,
}: {
  applicationId: string
  ratings: {
    work_quality: number
    professionalism: number
    punctuality: number
    responsiveness: number
    behaviour: number
  }
  comment: string
  error: string | null
  submitting: boolean
  onRatingChange: (
    field:
      | 'work_quality'
      | 'professionalism'
      | 'punctuality'
      | 'responsiveness'
      | 'behaviour',
    value: number
  ) => void
  onCommentChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-work-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* MODAL HEADER */}
        <div className="border-b border-slate-100 px-6 py-5">
          <h2
            id="complete-work-title"
            className="text-xl font-semibold text-slate-900"
          >
            Complete Work & Rate Worker
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Please rate the worker based on their performance.
          </p>
        </div>

        {/* RATINGS */}
        <div className="space-y-3 p-6">
          <RatingInput
            label="Work Quality"
            value={ratings.work_quality}
            onChange={(value) =>
              onRatingChange('work_quality', value)
            }
          />

          <RatingInput
            label="Professionalism"
            value={ratings.professionalism}
            onChange={(value) =>
              onRatingChange('professionalism', value)
            }
          />

          <RatingInput
            label="Punctuality"
            value={ratings.punctuality}
            onChange={(value) =>
              onRatingChange('punctuality', value)
            }
          />

          <RatingInput
            label="Responsiveness"
            value={ratings.responsiveness}
            onChange={(value) =>
              onRatingChange('responsiveness', value)
            }
          />

          <RatingInput
            label="Behaviour"
            value={ratings.behaviour}
            onChange={(value) =>
              onRatingChange('behaviour', value)
            }
          />

          {/* COMMENT */}
          <div className="pt-3">
            <label
              htmlFor={`review-${applicationId}`}
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Optional Comment
            </label>

            <textarea
              id={`review-${applicationId}`}
              value={comment}
              onChange={(event) =>
                onCommentChange(event.target.value)
              }
              rows={4}
              placeholder="Share your feedback about the worker..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Complete & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   RATING INPUT
========================================================= */

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {label}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {value === 0
              ? 'Not rated'
              : `${value} out of 5`}
          </p>
        </div>

        <div
          className="flex items-center"
          aria-label={`${label} rating`}
        >
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              aria-label={`${rating} star${
                rating === 1 ? '' : 's'
              }`}
              aria-pressed={rating === value}
              onClick={() => onChange(rating)}
              className={`px-1 text-2xl leading-none transition hover:scale-110 ${
                rating <= value
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {rating <= value ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   STATUS
========================================================= */

function getStatusInfo(status: string) {
  switch (status) {
    case 'APPLIED':
      return {
        label: 'Pending',
        className: 'bg-blue-50 text-blue-700',
      }

    case 'APPROVED':
      return {
        label: 'Approved',
        className: 'bg-green-50 text-green-700',
      }

    case 'COMPLETED':
      return {
        label: 'Completed',
        className: 'bg-emerald-50 text-emerald-700',
      }

    case 'SHORTLISTED':
      return {
        label: 'Shortlisted',
        className: 'bg-purple-50 text-purple-700',
      }

    case 'INTERVIEW':
      return {
        label: 'Interview',
        className: 'bg-orange-50 text-orange-700',
      }

    case 'HIRED':
      return {
        label: 'Hired',
        className: 'bg-emerald-50 text-emerald-700',
      }

    case 'REJECTED':
      return {
        label: 'Rejected',
        className: 'bg-red-50 text-red-700',
      }

    default:
      return {
        label: status,
        className: 'bg-slate-50 text-slate-700',
      }
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)

  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* =========================================================
   RATING FORMAT
========================================================= */

function formatRating(
  rating: number | string | null | undefined
): string {
  const numericRating = Number(rating)

  return Number.isFinite(numericRating)
    ? numericRating.toFixed(1)
    : '0.0'
}

/* =========================================================
   SUPABASE ERROR
========================================================= */

function getSupabaseErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    const code = 'code' in error ? error.code : undefined

    if (typeof message === 'string') {
      return typeof code === 'string'
        ? `${message} (${code})`
        : message
    }
  }

  return error instanceof Error
    ? error.message
    : 'Failed to complete and rate work'
}