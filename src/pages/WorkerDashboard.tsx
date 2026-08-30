import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { WorkerProfile } from '@/types'

export function WorkerDashboard() {
  const { profile } = useAuth()
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    Promise.all([
      supabase
        .from('worker_profiles')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle(),

      supabase
        .from('profiles')
        .select('phone')
        .eq('id', profile.id)
        .maybeSingle(),
    ]).then(
      ([
        { data: workerData, error: workerErr },
        { data: profData, error: profErr },
      ]) => {
        if (workerErr) console.error(workerErr.message)
        if (profErr) console.error(profErr.message)

        setWorkerProfile(workerData as WorkerProfile | null)
        setPhone(profData?.phone ?? profile.phone ?? null)
        setLoading(false)
      },
    )
  }, [profile])

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Worker Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {profile?.full_name ?? profile?.email}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Verification"
            value={workerProfile?.verification_status ?? 'Not set up'}
          />

          <StatCard
            label="Trust Score"
            value={workerProfile ? `${workerProfile.trust_score}` : '—'}
          />

          <StatCard
            label="Overall Rating"
            value={
              workerProfile
                ? `${formatRating(workerProfile.rating)} · ${workerProfile.rating_count} reviews`
                : '—'
            }
          />
        </div>

        {/* Quick Actions */}
        <section className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickLink
              title="Browse Jobs"
              description="Find jobs that match your skills"
              to="/worker/jobs"
            />

            <QuickLink
              title="My Applications"
              description="Track the status of your applications"
              to="/worker/applications"
            />
          </div>
        </section>

        {/* Profile */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Profile Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Your Profile
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Your professional information
              </p>
            </div>

            {workerProfile && !loading && (
              <Link
                to="/worker/profile"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 transition hover:bg-primary-50 hover:text-primary-700"
              >
                Edit profile
              </Link>
            )}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Loading profile...
            </div>
          ) : workerProfile ? (
            <div className="p-5">
              {/* Professional Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Professional Information
                </h3>

                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="Skills"
                    value={workerProfile.skills?.join(', ') ?? 'Not set'}
                  />

                  <Field
                    label="Experience"
                    value={
                      workerProfile.years_of_experience != null
                        ? `${workerProfile.years_of_experience} years`
                        : 'Not set'
                    }
                  />

                  <Field
                    label="Location"
                    value={workerProfile.location ?? 'Not set'}
                  />

                  <Field
                    label="Availability"
                    value={workerProfile.availability ?? 'Not set'}
                  />

                  <Field
                    label="Expected Salary"
                    value={
                      workerProfile.expected_salary != null
                        ? `₹${workerProfile.expected_salary.toLocaleString(
                            'en-IN',
                          )}/mo`
                        : 'Not set'
                    }
                  />

                  <Field
                    label="Certifications"
                    value={
                      workerProfile.certifications
                        ? (
                            workerProfile.certifications as Array<{
                              name: string
                            }>
                          )
                            .map((c) => c.name)
                            .join(', ')
                        : 'None'
                    }
                  />

                  <Field
                    label="Phone"
                    value={phone ?? 'Not set'}
                  />
                </dl>
              </div>

              {/* Ratings & Reviews */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Ratings & Reviews
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Feedback from employers based on completed work
                  </p>
                </div>

                {/* Rating Summary */}
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Overall rating
                    </p>

                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-lg font-semibold text-slate-900">
                        {formatRating(workerProfile.rating)}
                      </span>

                      <span className="text-amber-500">★</span>

                      <span className="text-xs text-slate-500">
                        ({workerProfile.rating_count}{' '}
                        {workerProfile.rating_count === 1
                          ? 'review'
                          : 'reviews'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Categories */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <RatingItem
                    label="Work Quality"
                    value={workerProfile.work_quality_rating}
                  />

                  <RatingItem
                    label="Professionalism"
                    value={workerProfile.professionalism_rating}
                  />

                  <RatingItem
                    label="Punctuality"
                    value={workerProfile.punctuality_rating}
                  />

                  <RatingItem
                    label="Responsiveness"
                    value={workerProfile.responsiveness_rating}
                  />

                  <RatingItem
                    label="Behaviour"
                    value={workerProfile.behaviour_rating}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-8">
              <p className="mb-4 text-sm text-slate-500">
                You haven't set up your worker profile yet.
              </p>

              <Link
                to="/worker/profile"
                className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
              >
                Create your profile
              </Link>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function formatRating(
  rating: number | string | null | undefined,
): string {
  const numericRating = Number(rating)

  return Number.isFinite(numericRating)
    ? numericRating.toFixed(1)
    : '0.0'
}

/* -------------------------------------------------------
   Summary Card
------------------------------------------------------- */

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}

/* -------------------------------------------------------
   Profile Field
------------------------------------------------------- */

function Field({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 truncate text-sm font-medium text-slate-800">
        {value}
      </dd>
    </div>
  )
}

/* -------------------------------------------------------
   Rating Item
------------------------------------------------------- */

function RatingItem({
  label,
  value,
}: {
  label: string
  value: number | string | null | undefined
}) {
  const rating = Number(value)

  const displayRating = Number.isFinite(rating)
    ? rating.toFixed(1)
    : '0.0'

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <span className="text-amber-500">★</span>
        {displayRating}
      </span>
    </div>
  )
}

/* -------------------------------------------------------
   Quick Action
------------------------------------------------------- */

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
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900 transition group-hover:text-primary-600">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <span className="ml-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600">
        →
      </span>
    </Link>
  )
}