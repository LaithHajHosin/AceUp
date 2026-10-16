import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../../api/client'
import { getQuestions } from '../../api/questions'
import { createSession } from '../../api/sessions'
import { ApiErrorNotice } from '../../components/ApiError'
import type { Difficulty, PublicQuestion } from '../../types/api'

const questionCounts = [5, 6, 7, 8, 9, 10]
const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

export function SetupPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<PublicQuestion[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [questionLoadError, setQuestionLoadError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [isCreating, setIsCreating] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [serverAvailableCount, setServerAvailableCount] = useState<number | null>(null)

  useEffect(() => {
    let isCurrent = true
    setIsLoadingQuestions(true)
    getQuestions()
      .then(({ items }) => {
        if (isCurrent) setQuestions(items)
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setQuestionLoadError(
            getErrorMessage(error, 'Could not load available questions.'),
          )
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingQuestions(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  const categories = useMemo(
    () => [...new Set(questions.map((question) => question.category))].sort(),
    [questions],
  )

  const availableCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.category === category.trim() &&
          question.difficulty === difficulty,
      ).length,
    [category, difficulty, questions],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setServerAvailableCount(null)

    const normalizedName = displayName.trim()
    const normalizedCategory = category.trim()
    if (!normalizedName || normalizedName.length > 80) {
      setSubmitError('Enter a display name between 1 and 80 characters.')
      return
    }
    if (!normalizedCategory) {
      setSubmitError('Choose or enter a question category.')
      return
    }

    setIsCreating(true)
    try {
      const session = await createSession({
        displayName: normalizedName,
        category: normalizedCategory,
        difficulty,
        questionCount,
      })
      navigate(`/interview/${session.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_QUESTIONS') {
        const count = error.details?.availableCount
        if (typeof count === 'number' && Number.isInteger(count) && count >= 0) {
          setServerAvailableCount(count)
          setSubmitError(
            count >= 5
              ? `Only ${count} matching questions are available. Choose a smaller session or another category or difficulty.`
              : `Only ${count} matching questions are available; at least 5 are required. Choose another category or difficulty.`,
          )
        } else {
          setSubmitError(error.message)
        }
      } else {
        setSubmitError(
          getErrorMessage(error, 'Could not start your practice session.'),
        )
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="setup-layout">
      <section className="setup-main">
        <div className="page-heading">
          <span className="eyebrow">Your next step starts here</span>
          <h1>Build your practice session</h1>
          <p>Choose a focus and we’ll put together a timed interview tailored to you.</p>
        </div>

        <form className="setup-card" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <span className="section-number">01</span>
            <div>
              <h2>About you</h2>
              <p>Just a name to personalize your session.</p>
            </div>
          </div>

          <label className="field-label" htmlFor="display-name">Display name</label>
          <input
            autoComplete="nickname"
            id="display-name"
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Alex"
            required
            value={displayName}
          />
          <p className="field-hint">Use a nickname — this isn’t an account or private history.</p>

          <div className="form-divider" />

          <div className="form-section-heading">
            <span className="section-number">02</span>
            <div>
              <h2>Choose your focus</h2>
              <p>Pick a category, difficulty and session length.</p>
            </div>
          </div>

          <div className="field-grid">
            <div className="field">
              <label className="field-label" htmlFor="category">Category</label>
              <input
                autoComplete="off"
                id="category"
                list="question-categories"
                onChange={(event) => {
                  setCategory(event.target.value)
                  setServerAvailableCount(null)
                  setSubmitError('')
                }}
                placeholder={isLoadingQuestions ? 'Loading suggestions…' : 'e.g. arrays'}
                required
                value={category}
              />
              <datalist id="question-categories">
                {categories.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                onChange={(event) => {
                  const value = event.target.value
                  if (value === 'easy' || value === 'medium' || value === 'hard') {
                    setDifficulty(value)
                  }
                  setServerAvailableCount(null)
                  setSubmitError('')
                }}
                value={difficulty}
              >
                {difficulties.map((value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field count-field">
            <label className="field-label" htmlFor="question-count">Questions in this session</label>
            <select
              id="question-count"
              onChange={(event) => {
                setQuestionCount(Number(event.target.value))
                setServerAvailableCount(null)
                setSubmitError('')
              }}
              value={questionCount}
            >
              {questionCounts.map((count) => (
                <option key={count} value={count}>{count} questions</option>
              ))}
            </select>
            <p className="field-hint">
              {serverAvailableCount !== null
                ? `${serverAvailableCount} matching questions are available on the server.`
                : questionLoadError
                  ? 'Availability will be checked when you start.'
                  : isLoadingQuestions
                    ? 'Checking question availability…'
                    : `${availableCount} matching question${availableCount === 1 ? '' : 's'} available`}
            </p>
          </div>

          {questionLoadError && (
            <ApiErrorNotice
              message={`${questionLoadError} You can still try starting a session.`}
              title="Could not check question availability"
            />
          )}
          {submitError && <ApiErrorNotice message={submitError} title="Session not started" />}

          <button className="primary-button setup-submit" disabled={isCreating} type="submit">
            {isCreating ? 'Preparing your session…' : 'Start practice session'}
            {!isCreating && <span aria-hidden="true">→</span>}
          </button>
          <p className="form-footnote">You can finish your session at any time. Your answers are scored by the server.</p>
        </form>
      </section>

      <aside className="setup-aside">
        <div className="aside-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-dot dot-one" />
          <div className="art-dot dot-two" />
          <div className="art-card">
            <span>SESSION PREVIEW</span>
            <strong>{questionCount}</strong>
            <small>thoughtful questions</small>
            <div className="art-progress"><span style={{ width: `${questionCount * 10}%` }} /></div>
            <div className="art-tag">{difficulty} focus</div>
          </div>
        </div>
        <div className="aside-copy">
          <span className="eyebrow">A little structure goes a long way</span>
          <h2>Practice that feels like the real thing.</h2>
          <ul className="benefit-list">
            <li><span>✓</span> A focused set based on your goals</li>
            <li><span>✓</span> A fair timer for every question</li>
            <li><span>✓</span> Feedback to guide your next step</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
