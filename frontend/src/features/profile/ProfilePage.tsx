import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [message, setMessage] = useState('')

  const stats = useMemo(
    () => ({
      questionsCreated: 3,
      interviewsCreated: 2,
      attemptsCompleted: 7,
      questionsAnswered: 24,
      averageScore: 81,
      bestScore: 95,
    }),
    [],
  )

  const currentUser = user ?? { id: 0, username: '', email: '', displayName: '', bio: '' }

  if (!user) {
    return null
  }

  function handleSubmit() {
    updateProfile({ displayName: displayName.trim() || currentUser.displayName, bio: bio.trim() })
    setMessage('Profile updated.')
  }

  return (
    <div className="profile-layout">
      <section className="profile-card">
        <div className="page-heading">
          <span className="eyebrow">Your profile</span>
          <h1>{currentUser.displayName}</h1>
        </div>

        <div className="profile-form-grid">
          <label className="field-label" htmlFor="profile-display-name">Display name</label>
          <input
            id="profile-display-name"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />

          <label className="field-label" htmlFor="profile-bio">Bio</label>
          <textarea id="profile-bio" onChange={(event) => setBio(event.target.value)} rows={4} value={bio} />

          <button className="primary-button" onClick={handleSubmit} type="button">
            Save profile
          </button>
          {message && <p className="form-success">{message}</p>}
        </div>
      </section>

      <section className="profile-card stats-card">
        <h2>Performance stats</h2>
        <div className="stats-grid">
          <div><span>Questions created</span><strong>{stats.questionsCreated}</strong></div>
          <div><span>Interviews created</span><strong>{stats.interviewsCreated}</strong></div>
          <div><span>Attempts completed</span><strong>{stats.attemptsCompleted}</strong></div>
          <div><span>Questions answered</span><strong>{stats.questionsAnswered}</strong></div>
          <div><span>Average score</span><strong>{stats.averageScore}%</strong></div>
          <div><span>Best score</span><strong>{stats.bestScore}%</strong></div>
        </div>
      </section>
    </div>
  )
}
