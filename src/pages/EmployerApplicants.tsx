import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Job, Application, Profile, WorkerProfile, Certification } from '@/types'

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
      setLoading(true)
      setError(null)

      try {
        // Fetch the job
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

        // Verify that the current user owns this job
        if (!currentProfile || jobRecord.employer_id !== currentProfile.id) {
          setError('You do not have permission to view applicants for this job')
          setJob(jobRecord)
          return
        }

        setJob(jobRecord)

        // Fetch applications for this job
        const { data: applicationsData, error: appError } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })

        if (appError) throw appError

        const applications = (applicationsData as Application[]) || []

        // For each application, fetch worker profile and profile data
        const applicantDataList: ApplicantData[] = []

        for (const app of applications) {
          try {
            const [{ data: workerProfileData }, { data: profileData }] = await Promise.all([
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
        setError(err instanceof Error ? err.message : 'Failed to load applicants')
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
          <p className="text-sm text-error-600">{error || 'Job not found'}</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <button
          onClick={() => navigate('/employer')}
          className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Applicants for {job.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {applicants.length} application{applicants.length !== 1 ? 's' : ''}
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">No applications yet for this job.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.application.id}
              applicant={applicant}
              onApprovalStatusChange={(updatedApp) => {
                setApplicants((prev) =>
                  prev.map((app) =>
                    app.application.id === updatedApp.id
                      ? { ...app, application: updatedApp }
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

  async function handleApprove() {
    setApproving(true)
    setApprovalMessage(null)

    try {
      const { data, error } = await supabase
        .from('applications')
        .update({ status: 'APPROVED' })
        .eq('id', application.id)
        .select()
        .single()

      if (error) throw error

      setApprovalMessage({
        type: 'success',
        text: 'Application approved successfully.',
      })

      // Update parent state with the updated application
      if (data) {
        onApprovalStatusChange(data as Application)
      }

      // Clear message after 3 seconds
      setTimeout(() => setApprovalMessage(null), 3000)
    } catch (err) {
      setApprovalMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to approve application',
      })
    } finally {
      setApproving(false)
    }
  }

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
    if (Object.values(completionRatings).some((rating) => rating < 1 || rating > 5)) {
      setCompletionError('Please provide all five ratings.')
      return
    }

    setSubmittingCompletion(true)
    setCompletionError(null)

    try {
      const { error } = await supabase.rpc('complete_and_rate_application', {
        p_application_id: application.id,
        p_work_quality: completionRatings.work_quality,
        p_professionalism: completionRatings.professionalism,
        p_punctuality: completionRatings.punctuality,
        p_responsiveness: completionRatings.responsiveness,
        p_behaviour: completionRatings.behaviour,
        p_review: completionComment.trim() || null,
      })

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
      setCompletionError(err instanceof Error ? err.message : 'Failed to complete and rate work')
    } finally {
      setSubmittingCompletion(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-blue-50 text-blue-700'
      case 'APPROVED':
        return 'bg-green-50 text-green-700'
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700'
      case 'SHORTLISTED':
        return 'bg-purple-50 text-purple-700'
      case 'INTERVIEW':
        return 'bg-orange-50 text-orange-700'
      case 'HIRED':
        return 'bg-emerald-50 text-emerald-700'
      case 'REJECTED':
        return 'bg-red-50 text-red-700'
      default:
        return 'bg-slate-50 text-slate-700'
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const showContactInfo = application.status === 'APPROVED'

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      {approvalMessage && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            approvalMessage.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-error-50 text-error-600'
          }`}
        >
          {approvalMessage.text}
        </div>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {profile?.full_name || 'Unknown Worker'}
          </h3>
          {showContactInfo ? (
            <div className="mt-1 space-y-0.5">
              {profile?.email && (
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-600">Email:</span> {profile.email}
                </p>
              )}
              {profile?.phone ? (
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-600">Phone:</span> {profile.phone}
                </p>
              ) : (
                <p className="text-xs italic text-slate-400">No phone number provided</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-xs italic text-slate-400">
              Contact information hidden until application is approved
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400">Applied {formatDate(application.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
              application.status
            )}`}
          >
            {application.status}
          </span>
          {application.status === 'APPLIED' && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {approving ? 'Approving...' : 'Approve'}
            </button>
          )}
          {application.status === 'APPROVED' && (
            <button
              onClick={openCompletionDialog}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Work Done
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {workerProfile?.location && (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Location</p>
            <p className="mt-1 text-sm text-slate-900">{workerProfile.location}</p>
          </div>
        )}

        {workerProfile?.years_of_experience != null && (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Experience</p>
            <p className="mt-1 text-sm text-slate-900">
              {workerProfile.years_of_experience} years
            </p>
          </div>
        )}

        {workerProfile?.verification_status && (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Verification</p>
            <p className="mt-1 text-sm text-slate-900">{workerProfile.verification_status}</p>
          </div>
        )}

        {workerProfile?.rating != null && (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Overall Rating</p>
            <p className="mt-1 text-sm text-slate-900">
              {formatRating(workerProfile.rating)} ({workerProfile.rating_count} reviews)
            </p>
          </div>
        )}

        {workerProfile && (
          <>
            <RatingField label="Work Quality" value={workerProfile.work_quality_rating} />
            <RatingField label="Professionalism" value={workerProfile.professionalism_rating} />
            <RatingField label="Punctuality" value={workerProfile.punctuality_rating} />
            <RatingField label="Responsiveness" value={workerProfile.responsiveness_rating} />
            <RatingField label="Behaviour" value={workerProfile.behaviour_rating} />
          </>
        )}
      </div>

      {workerProfile?.skills && workerProfile.skills.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase text-slate-400">Skills</p>
          <div className="flex flex-wrap gap-2">
            {workerProfile.skills.map((skill) => (
              <span
                key={skill}
                className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium uppercase text-slate-400">Skills</p>
          <p className="text-sm text-slate-500">No skills listed</p>
        </div>
      )}

      {workerProfile?.certifications && workerProfile.certifications.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase text-slate-400">Certifications</p>
          <div className="space-y-1">
            {(workerProfile.certifications as Certification[]).map((cert) => (
              <div key={cert.name} className="text-sm text-slate-900">
                {cert.name}
                {cert.issuer && <span className="text-slate-500"> • {cert.issuer}</span>}
                {cert.year && <span className="text-slate-500"> • {cert.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {application.cover_note && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-slate-400">Cover Note</p>
          <p className="whitespace-pre-line text-sm text-slate-900">{application.cover_note}</p>
        </div>
      )}

      {showCompletionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-work-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="complete-work-title" className="text-xl font-semibold text-slate-900">
              Complete Work &amp; Rate
            </h2>
            <div className="mt-5 space-y-4">
              <RatingInput
                label="Work Quality"
                value={completionRatings.work_quality}
                onChange={(value) => setCompletionRatings((current) => ({ ...current, work_quality: value }))}
              />
              <RatingInput
                label="Professionalism"
                value={completionRatings.professionalism}
                onChange={(value) => setCompletionRatings((current) => ({ ...current, professionalism: value }))}
              />
              <RatingInput
                label="Punctuality"
                value={completionRatings.punctuality}
                onChange={(value) => setCompletionRatings((current) => ({ ...current, punctuality: value }))}
              />
              <RatingInput
                label="Responsiveness"
                value={completionRatings.responsiveness}
                onChange={(value) => setCompletionRatings((current) => ({ ...current, responsiveness: value }))}
              />
              <RatingInput
                label="Behaviour"
                value={completionRatings.behaviour}
                onChange={(value) => setCompletionRatings((current) => ({ ...current, behaviour: value }))}
              />
              <div>
                <label htmlFor={`review-${application.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                  Optional Comment
                </label>
                <textarea
                  id={`review-${application.id}`}
                  value={completionComment}
                  onChange={(event) => setCompletionComment(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            {completionError && <p className="mt-4 text-sm text-error-600">{completionError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCompletionDialog(false)}
                disabled={submittingCompletion}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteAndSubmit}
                disabled={submittingCompletion}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingCompletion ? 'Submitting...' : 'Complete & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex" aria-label={`${label} rating`}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
            aria-pressed={rating === value}
            onClick={() => onChange(rating)}
            className={`px-0.5 text-2xl leading-none ${rating <= value ? 'text-amber-400' : 'text-slate-300'}`}
          >
            {rating <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )
}

function RatingField({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{formatRating(value)}</p>
    </div>
  )
}

function formatRating(rating: number): string {
  return Number(rating).toFixed(1)
}
