import { useNavigate, useParams } from 'react-router-dom'

export function StartAttemptPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  function start() {
    navigate(`/attempts/${id ?? '1'}`)
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">Ready to begin</span>
        <h1>Start this interview</h1>
        <p className="auth-copy">You will get a timed attempt for interview #{id ?? '1'}.</p>
        <button className="primary-button" onClick={start} type="button">
          Start attempt
        </button>
      </section>
    </div>
  )
}
