import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'
import type { Certification } from '@/types'

export function WorkerProfilePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    skills: [] as string[],
    years_of_experience: null as number | null,
    location: '',
    phone: '',
    availability: '',
    expected_salary: null as number | null,
    certifications: [] as Certification[],
  })

  const [skillInput, setSkillInput] = useState('')
  const [certInput, setCertInput] = useState({ name: '', issuer: '', year: '' })

  function isValidPhone(phone: string): boolean {
    if (!phone.trim()) return true
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
    return /^\+?[0-9]{7,15}$/.test(cleaned)
  }

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }

    async function loadProfile() {
      if (!profile) return
      setLoading(true)
      try {
        const [{ data: workerData, error: workerError }, { data: profileData, error: profileError }] =
          await Promise.all([
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
          ])

        if (workerError) throw workerError
        if (profileError) throw profileError

        setFormData({
          skills: workerData?.skills || [],
          years_of_experience: workerData?.years_of_experience ?? null,
          location: workerData?.location || '',
          phone: profileData?.phone ?? profile.phone ?? '',
          availability: workerData?.availability || '',
          expected_salary: workerData?.expected_salary ?? null,
          certifications: workerData?.certifications || [],
        })
      } catch (err: any) {
        const errorMsg =
          err?.message ||
          (err instanceof Error ? err.message : 'Failed to load profile')
        setMessage({
          type: 'error',
          text: errorMsg,
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return

    if (formData.phone && !isValidPhone(formData.phone)) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid phone number (e.g., +91 9876543210 or 9876543210)',
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // 1. Update phone in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone.trim() || null,
        })
        .eq('id', profile.id)

      if (profileError) throw profileError

      // 2. Upsert worker qualifications in worker_profiles table
      const { error: workerError } = await supabase
        .from('worker_profiles')
        .upsert(
          {
            profile_id: profile.id,
            skills: formData.skills.length > 0 ? formData.skills : null,
            years_of_experience: formData.years_of_experience,
            location: formData.location || null,
            availability: formData.availability || null,
            expected_salary: formData.expected_salary,
            certifications:
              formData.certifications.length > 0
                ? (formData.certifications as Certification[])
                : null,
          },
          { onConflict: 'profile_id' }
        )
        .select()
        .single()

      if (workerError) throw workerError

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        (err instanceof Error ? err.message : 'Failed to save profile')
      setMessage({
        type: 'error',
        text: errorMsg,
      })
    } finally {
      setSaving(false)
    }
  }

  function addSkill() {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }))
      setSkillInput('')
    }
  }

  function removeSkill(skill: string) {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  function addCertification() {
    if (
      certInput.name.trim() &&
      !formData.certifications.some((c) => c.name === certInput.name.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        certifications: [
          ...prev.certifications,
          {
            name: certInput.name.trim(),
            issuer: certInput.issuer.trim() || null,
            year: certInput.year ? parseInt(certInput.year) : null,
          },
        ],
      }))
      setCertInput({ name: '', issuer: '', year: '' })
    }
  }

  function removeCertification(name: string) {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.name !== name),
    }))
  }

    if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Your Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your professional information
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
            <p className="text-sm text-slate-500">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Your Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your professional information
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Professional Information */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Professional Information
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Tell employers about your skills and experience.
              </p>
            </div>

            <div className="space-y-5 p-5">
              {/* Skills */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Skills
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    placeholder="Add a skill, e.g. Plumbing"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />

                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                  >
                    Add
                  </button>
                </div>

                {formData.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <div
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                      >
                        {skill}

                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-primary-400 transition hover:text-primary-700"
                          aria-label={`Remove ${skill}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Experience + Location */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Years of Experience
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={formData.years_of_experience ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        years_of_experience: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="e.g. 5"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Location
                  </label>

                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g. Hyderabad, Telangana"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              {/* Availability + Salary */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Availability
                  </label>

                  <select
                    value={formData.availability}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        availability: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  >
                    <option value="">Select availability</option>
                    <option value="Immediately">Immediately</option>
                    <option value="1 week notice">1 week notice</option>
                    <option value="2 weeks notice">2 weeks notice</option>
                    <option value="1 month notice">1 month notice</option>
                    <option value="Not available">Not available</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Expected Salary
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      (per month)
                    </span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={formData.expected_salary ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expected_salary: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        }))
                      }
                      placeholder="30000"
                      className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Contact Information
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Keep your contact information up to date.
              </p>
            </div>

            <div className="p-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone Number
              </label>

              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="e.g. +91 9876543210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Your phone number is shared with employers according to the
                application's contact-sharing rules.
              </p>
            </div>
          </section>

          {/* Certifications */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                Certifications
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Add certificates or qualifications that support your work.
              </p>
            </div>

            <div className="p-5">
              <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_110px_auto]">
                <input
                  type="text"
                  value={certInput.name}
                  onChange={(e) =>
                    setCertInput((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Certification name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />

                <input
                  type="text"
                  value={certInput.issuer}
                  onChange={(e) =>
                    setCertInput((prev) => ({
                      ...prev,
                      issuer: e.target.value,
                    }))
                  }
                  placeholder="Issuer"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />

                <input
                  type="number"
                  min="1900"
                  max="2099"
                  value={certInput.year}
                  onChange={(e) =>
                    setCertInput((prev) => ({
                      ...prev,
                      year: e.target.value,
                    }))
                  }
                  placeholder="Year"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />

                <button
                  type="button"
                  onClick={addCertification}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                >
                  Add
                </button>
              </div>

              {formData.certifications.length > 0 && (
                <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {formData.certifications.map((cert) => (
                    <div
                      key={cert.name}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {cert.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {cert.issuer || 'Issuer not specified'}
                          {cert.year ? ` • ${cert.year}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCertification(cert.name)}
                        className="shrink-0 text-xs font-medium text-slate-400 transition hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate('/worker')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}