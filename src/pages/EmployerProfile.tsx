import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'

export function EmployerProfilePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    industry: '',
    location: '',
    website: '',
  })

  useEffect(() => {
    if (!profile) {
      setLoading(false)
      return
    }

    async function loadProfile() {
      if (!profile) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setFormData({
            company_name: data.company_name || '',
            description: data.description || '',
            industry: data.industry || '',
            location: data.location || '',
            website: data.website || '',
          })
        }
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load company profile',
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

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('company_profiles')
        .upsert(
          {
            profile_id: profile.id,
            company_name: formData.company_name || null,
            description: formData.description || null,
            industry: formData.industry || null,
            location: formData.location || null,
            website: formData.website || null,
          },
          { onConflict: 'profile_id' }
        )
        .select()
        .single()

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Company profile updated successfully!',
      })

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save company profile',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
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
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Edit your company information</p>
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
          {/* Company Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company Name <span className="text-error-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  company_name: e.target.value,
                }))
              }
              placeholder="e.g., ABC Constructions"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Tell us about your company..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  industry: e.target.value,
                }))
              }
              placeholder="e.g., Construction, Manufacturing, Logistics"
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

          {/* Website */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  website: e.target.value,
                }))
              }
              placeholder="e.g., https://example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
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
              onClick={() => navigate('/employer')}
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
