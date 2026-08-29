import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'

export function PostJobPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    salary_min: '',
    salary_max: '',
    job_type: '',
    required_skills: [] as string[],
  })

  const [skillInput, setSkillInput] = useState('')

  function addSkill() {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()],
      }))
      setSkillInput('')
    }
  }

  function removeSkill(skill: string) {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skill),
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return

    // Validate required fields
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Job title is required' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('jobs')
        .insert([
          {
            employer_id: profile.id,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            location: formData.location.trim() || null,
            salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
            salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
            job_type: formData.job_type.trim() || null,
            required_skills:
              formData.required_skills.length > 0 ? formData.required_skills : null,
            is_active: true,
          },
        ])

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Job posted successfully!',
      })

      // Navigate back to dashboard after 1.5 seconds
      setTimeout(() => {
        navigate('/employer')
      }, 1500)
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to post job',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Post a New Job</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in the details to post a job and find the right workers
        </p>
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
          {/* Job Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Title <span className="text-error-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="e.g., Plumber, Electrician, Carpenter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe the job, responsibilities, and expectations..."
              rows={5}
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

          {/* Job Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Job Type</label>
            <select
              value={formData.job_type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  job_type: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select job type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="One-time">One-time</option>
            </select>
          </div>

          {/* Salary Section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Salary Min (INR)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_min}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    salary_min: e.target.value,
                  }))
                }
                placeholder="e.g., 20000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Salary Max (INR)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_max}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    salary_max: e.target.value,
                  }))
                }
                placeholder="e.g., 50000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Required Skills
            </label>
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
                placeholder="Add a skill (e.g., Plumbing, Welding)"
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
            {formData.required_skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.required_skills.map((skill) => (
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

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Job'}
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
