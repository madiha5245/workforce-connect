import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { AppLayout } from '@/components/AppLayout'

export function PostJobPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

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
    const skill = skillInput.trim()

    if (skill && !formData.required_skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, skill],
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

    if (!formData.title.trim()) {
      setMessage({
        type: 'error',
        text: 'Job title is required',
      })
      return
    }

    if (
      formData.salary_min &&
      formData.salary_max &&
      Number(formData.salary_min) > Number(formData.salary_max)
    ) {
      setMessage({
        type: 'error',
        text: 'Minimum salary cannot be greater than maximum salary.',
      })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const { error } = await supabase.from('jobs').insert([
        {
          employer_id: profile.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          location: formData.location.trim() || null,
          salary_min: formData.salary_min
            ? parseFloat(formData.salary_min)
            : null,
          salary_max: formData.salary_max
            ? parseFloat(formData.salary_max)
            : null,
          job_type: formData.job_type.trim() || null,
          required_skills:
            formData.required_skills.length > 0
              ? formData.required_skills
              : null,
          is_active: true,
        },
      ])

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Job posted successfully!',
      })

      setTimeout(() => {
        navigate('/employer')
      }, 1500)
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Failed to post job',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/employer')}
          className="mb-4 text-sm font-medium text-primary-600 transition hover:text-primary-700"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Post a New Job
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Create a job listing and find the right workers for your needs.
        </p>
      </div>

      <div className="max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {message && (
          <div
            className={`mb-6 rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                : 'bg-error-50 text-error-600 ring-1 ring-error-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">

          {/* Job Information */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Job Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Provide the basic details about the job.
              </p>
            </div>

            <div className="space-y-5">

              {/* Job Title */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
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
                  placeholder="Describe the work, responsibilities, requirements, and expectations..."
                  rows={5}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              {/* Location + Job Type */}
              <div className="grid gap-5 md:grid-cols-2">

                {/* Location */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
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
                    placeholder="e.g., Mumbai, Maharashtra"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                {/* Job Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Job Type
                  </label>

                  <select
                    value={formData.job_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        job_type: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="">Select job type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                    <option value="One-time">One-time</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Salary Section */}
          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Salary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Specify the expected salary range in Indian Rupees.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="grid gap-5 md:grid-cols-2">

                {/* Minimum */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Minimum Salary
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      ₹
                    </span>

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
                      placeholder="20,000"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>

                {/* Maximum */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Maximum Salary
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      ₹
                    </span>

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
                      placeholder="50,000"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Skills Section */}
          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Required Skills
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add the skills workers should have for this job.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                placeholder="e.g., Plumbing, Welding, Electrical"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />

              <button
                type="button"
                onClick={addSkill}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add Skill
              </button>
            </div>

            {formData.required_skills.length > 0 && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Added Skills
                </p>

                <div className="flex flex-wrap gap-2">
                  {formData.required_skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-100"
                    >
                      <span>{skill}</span>

                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="text-primary-500 transition hover:text-primary-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-7 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() => navigate('/employer')}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-600 px-7 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Job'}
            </button>

          </div>
        </form>
      </div>
    </AppLayout>
  )
}