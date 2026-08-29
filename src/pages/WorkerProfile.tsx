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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Loading profile...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Edit your worker profile information</p>
      </div>

      <div className="max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Skills */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Skills</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
                placeholder="Add a skill (e.g., Plumbing, Carpentry)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            {formData.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <div
                    key={skill}
                    className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Years of Experience */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
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
                  years_of_experience: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="e.g., 5"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder="e.g., Mumbai, Maharashtra"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder="e.g., +91 9876543210"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Only shared with employers after your application is approved.
            </p>
          </div>

          {/* Availability */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Availability</label>
            <select
              value={formData.availability}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  availability: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select availability</option>
              <option value="Immediately">Immediately</option>
              <option value="1 week notice">1 week notice</option>
              <option value="2 weeks notice">2 weeks notice</option>
              <option value="1 month notice">1 month notice</option>
              <option value="Not available">Not available</option>
            </select>
          </div>

          {/* Expected Salary */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Expected Salary (per month, INR)
            </label>
            <input
              type="number"
              min="0"
              value={formData.expected_salary ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expected_salary: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              placeholder="e.g., 30000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Certifications */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Certifications</label>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={certInput.name}
                  onChange={(e) => setCertInput((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Certification name (required)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={certInput.issuer}
                  onChange={(e) => setCertInput((prev) => ({ ...prev, issuer: e.target.value }))}
                  placeholder="Issuer (optional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1900"
                  max="2099"
                  value={certInput.year}
                  onChange={(e) => setCertInput((prev) => ({ ...prev, year: e.target.value }))}
                  placeholder="Year (optional)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={addCertification}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>

            {formData.certifications.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.certifications.map((cert) => (
                  <div
                    key={cert.name}
                    className="flex items-start justify-between rounded-lg bg-slate-50 p-3"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{cert.name}</p>
                      {cert.issuer && (
                        <p className="text-slate-500">
                          {cert.issuer}
                          {cert.year && ` • ${cert.year}`}
                        </p>
                      )}
                      {!cert.issuer && cert.year && (
                        <p className="text-slate-500">{cert.year}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCertification(cert.name)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/worker')}
              className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
