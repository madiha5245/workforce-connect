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

  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    industry: '',
    location: '',
    website: '',
    phone: '',
  })

  function isValidPhone(phone: string): boolean {
    if (!phone.trim()) return true

    const cleaned = phone.replace(/[\s\-().]/g, '')

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
        const [
          { data: companyData, error: companyError },
          { data: profileData, error: profileError },
        ] = await Promise.all([
          supabase
            .from('company_profiles')
            .select('*')
            .eq('profile_id', profile.id)
            .maybeSingle(),

          supabase
            .from('profiles')
            .select('phone')
            .eq('id', profile.id)
            .maybeSingle(),
        ])

        if (companyError) throw companyError
        if (profileError) throw profileError

        setFormData({
          company_name: companyData?.company_name || '',
          description: companyData?.description || '',
          industry: companyData?.industry || '',
          location: companyData?.location || '',
          website: companyData?.website || '',
          phone: profileData?.phone ?? profile.phone ?? '',
        })
      } catch (err: any) {
        const errorMsg =
          err?.message ||
          (err instanceof Error
            ? err.message
            : 'Failed to load company profile')

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
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone.trim() || null,
        })
        .eq('id', profile.id)

      if (profileError) throw profileError

      const { error: companyError } = await supabase
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

      if (companyError) throw companyError

      setMessage({
        type: 'success',
        text: 'Company profile updated successfully!',
      })

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        (err instanceof Error
          ? err.message
          : 'Failed to save company profile')

      setMessage({
        type: 'error',
        text: errorMsg,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Company Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your company information
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Loading profile...
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/employer')}
            className="mb-3 text-sm font-medium text-slate-500 transition hover:text-primary-600"
          >
            ← Dashboard
          </button>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Company Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Keep your company information up to date
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">

          {/* Message */}
          {message && (
            <div
              className={`mx-5 mt-5 rounded-lg px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 ring-1 ring-green-100'
                  : 'bg-error-50 text-error-600 ring-1 ring-error-100'
              }`}
            >
              {message.text}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6"
          >

            {/* Company Information */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Company Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Tell workers a little about your organization.
                </p>
              </div>

              <div className="space-y-4">

                {/* Company Name */}
                <FormField
                  label="Company Name"
                  required
                  description="The name workers will see on your job listings."
                >
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
                    className={inputClass}
                  />
                </FormField>

                {/* Industry */}
                <FormField label="Industry">
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
                    className={inputClass}
                  />
                </FormField>

                {/* Description */}
                <FormField label="Company Description">
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Tell workers about your company..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    A short description helps workers understand your company
                    before applying.
                  </p>
                </FormField>
              </div>
            </section>

            {/* Divider */}
            <div className="my-6 border-t border-slate-100" />

            {/* Contact Information */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Contact Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Add ways workers can learn more about your company.
                </p>
              </div>

              <div className="space-y-4">

                {/* Location */}
                <FormField label="Location">
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
                    className={inputClass}
                  />
                </FormField>

                {/* Phone */}
                <FormField label="Phone Number">
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
                    className={inputClass}
                  />
                </FormField>

                {/* Website */}
                <FormField label="Website">
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </FormField>
              </div>
            </section>

            {/* Actions */}
            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/employer')}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10'

function FormField({
  label,
  required = false,
  description,
  children,
}: {
  label: string
  required?: boolean
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-error-600">*</span>
        )}
      </label>

      {children}

      {description && (
        <p className="mt-1.5 text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  )
}