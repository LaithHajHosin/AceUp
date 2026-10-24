import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    bio: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      setIsSubmitting(true)
      await register(form)
      navigate('/setup', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'VALIDATION_ERROR'
      if (message === 'USERNAME_TAKEN') {
        setError('That username is already taken.')
        return
      }
      if (message === 'EMAIL_TAKEN') {
        setError('That email is already registered.')
        return
      }
      setError('Please complete all required fields.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Create account</span>
        <h1>Join PrepPressure</h1>
        <p className="auth-copy">Set up your profile and start building interview confidence.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="username">Username</label>
          <input id="username" onChange={(event) => updateField('username', event.target.value)} value={form.username} />

          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" onChange={(event) => updateField('email', event.target.value)} type="email" value={form.email} />

          <label className="field-label" htmlFor="displayName">Display name</label>
          <input id="displayName" onChange={(event) => updateField('displayName', event.target.value)} value={form.displayName} />

          <label className="field-label" htmlFor="bio">Bio</label>
          <textarea id="bio" onChange={(event) => updateField('bio', event.target.value)} rows={3} value={form.bio} />

          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" onChange={(event) => updateField('password', event.target.value)} type="password" value={form.password} />

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-link-row">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  )
}
