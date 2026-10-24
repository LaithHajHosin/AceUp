import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('demo')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      setIsSubmitting(true)
      await login({ identifier, password })
      navigate('/setup', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INVALID_CREDENTIALS'
      setError(message === 'INVALID_CREDENTIALS' ? 'Invalid email or password.' : 'Unable to sign in right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Login to PrepPressure</h1>
        <p className="auth-copy">Continue your interview practice with your saved account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="identifier">Username or email</label>
          <input
            id="identifier"
            onChange={(event) => setIdentifier(event.target.value)}
            value={identifier}
          />

          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="auth-link-row">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </div>
  )
}
