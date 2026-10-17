import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../../api/client'
import { finishSession, getSession, submitAnswer } from '../../api/sessions'
import { ApiErrorNotice } from '../../components/ApiError'
import { Timer } from '../../components/Timer'
import type { AnswerPayload, PublicQuestion, SessionResponse } from '../../types/api'

interface AnswerDraft {
  text: string
  choiceId: string
}

const emptyDraft: AnswerDraft = { text: '', choiceId: '' }

export function InterviewPage() {
  const { sessionId: sessionIdParam } = useParams()
  const navigate = useNavigate()
  const sessionId = Number(sessionIdParam)
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, AnswerDraft>>({})
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(() => new Set())
  const [answerError, setAnswerError] = useState('')
  const [answerErrorTitle, setAnswerErrorTitle] = useState('Answer not saved')
  const [finishError, setFinishError] = useState('')
  const [isSavingAnswer, setIsSavingAnswer] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  useEffect(() => {
    let isCurrent = true
    setSession(null)
    setLoadError('')
    setIsLoading(true)

    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      setLoadError('The session link is not valid.')
      setIsLoading(false)
      return () => {
        isCurrent = false
      }
    }

    getSession(sessionId)
      .then((result) => {
        if (isCurrent) setSession(result)
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadError(getErrorMessage(error, 'Could not load this session.'))
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [sessionId])

  useEffect(() => {
    setCurrentIndex(0)
    setDrafts({})
    setAnsweredIds(new Set())
    setAnswerError('')
  }, [sessionId])

  const questions = session?.questions ?? []
  const question: PublicQuestion | undefined = questions[currentIndex]
  const draft = question ? drafts[question.id] ?? emptyDraft : emptyDraft
  const isAnswered = question ? answeredIds.has(question.id) : false

  function updateDraft(changes: Partial<AnswerDraft>) {
    if (!question) return
    setDrafts((previous) => ({
      ...previous,
      [question.id]: { ...(previous[question.id] ?? emptyDraft), ...changes },
    }))
  }

  async function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !question || isAnswered) return
    setAnswerError('')
    setAnswerErrorTitle('Answer not saved')

    let answer: AnswerPayload
    if (question.type === 'multiple_choice') {
      if (!draft.choiceId) {
        setAnswerError('Choose an option before saving your answer.')
        return
      }
      answer = { type: 'multiple_choice', choiceId: draft.choiceId }
    } else {
      if (!draft.text.trim()) {
        setAnswerError('Enter an answer before saving.')
        return
      }
      if (draft.text.length > 1000) {
        setAnswerError('Your answer must be 1000 characters or fewer.')
        return
      }
      answer = { type: question.type, text: draft.text }
    }

    setIsSavingAnswer(true)
    try {
      await submitAnswer(session.id, { questionId: question.id, answer })
      setAnsweredIds((previous) => new Set(previous).add(question.id))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DUPLICATE_ANSWER') {
        setAnsweredIds((previous) => new Set(previous).add(question.id))
        setAnswerErrorTitle('Already answered')
        setAnswerError('A response for this question has already been saved.')
      } else if (error instanceof ApiError && error.code === 'SESSION_NOT_ACTIVE') {
        setAnswerError('This session has ended, so no more answers can be saved.')
      } else {
        setAnswerError(getErrorMessage(error, 'Your answer could not be saved.'))
      }
    } finally {
      setIsSavingAnswer(false)
    }
  }

  async function handleFinish() {
    if (!session) return
    setIsFinishing(true)
    setFinishError('')
    try {
      await finishSession(session.id)
      navigate(`/results/${session.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SESSION_NOT_ACTIVE') {
        navigate(`/results/${session.id}`)
        return
      }
      setFinishError(getErrorMessage(error, 'Could not finish this session.'))
      setIsFinishing(false)
    }
  }

  if (isLoading) {
    return <div className="loading-state"><span className="loading-spinner" /> Loading your session…</div>
  }

  if (loadError || !session) {
    return (
      <section className="interview-state">
        <ApiErrorNotice message={loadError || 'This session could not be found.'} title="Session unavailable" />
        <button className="secondary-button" onClick={() => navigate('/setup')} type="button">
          Back to setup
        </button>
      </section>
    )
  }

  if (session.status !== 'in_progress') {
    return (
      <section className="interview-state">
        <span className="eyebrow">Session complete</span>
        <h1>Your practice session has ended.</h1>
        <p>Your session results are ready.</p>
        <button className="primary-button" onClick={() => navigate(`/results/${session.id}`)} type="button">
          View results <span aria-hidden="true">→</span>
        </button>
      </section>
    )
  }

  if (!question) {
    return (
      <section className="interview-state">
        <ApiErrorNotice message="This session did not include any questions. Contact your project team." title="No questions found" />
        <button className="secondary-button" onClick={() => navigate('/setup')} type="button">
          Back to setup
        </button>
      </section>
    )
  }

  const progress = questions.length > 0
    ? ((currentIndex + 1) / questions.length) * 100
    : 0

  return (
    <div className="interview-layout">
      <header className="interview-header">
        <div>
          <span className="eyebrow">Live practice</span>
          <h1>Stay curious. Trust your preparation.</h1>
        </div>
        <Timer deadlineAt={session.deadlineAt} />
      </header>

      <div className="session-meta">
        <div>
          <span className="meta-label">Focus</span>
          <strong>{session.category}</strong>
        </div>
        <div>
          <span className="meta-label">Difficulty</span>
          <strong className={`difficulty-tag ${session.difficulty}`}>{session.difficulty}</strong>
        </div>
        <div>
          <span className="meta-label">Candidate</span>
          <strong>{session.displayName}</strong>
        </div>
        <div className="session-progress-copy">
          <span className="meta-label">Progress</span>
          <strong>{answeredIds.size} of {questions.length} saved</strong>
        </div>
      </div>

      <div className="progress-track" aria-label={`Question ${currentIndex + 1} of ${questions.length}`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="question-card" aria-labelledby="question-heading">
        <div className="question-card-top">
          <span className="question-number">
            QUESTION <strong>{String(currentIndex + 1).padStart(2, '0')}</strong>
            <span> / {String(questions.length).padStart(2, '0')}</span>
          </span>
          <span className={`question-type ${question.type}`}>
            {question.type.replace('_', ' ')}
          </span>
        </div>

        <h2 id="question-heading">{question.prompt}</h2>

        {question.type === 'code_output' && question.codeSnippet && (
          <pre className="code-snippet"><code>{question.codeSnippet}</code></pre>
        )}

        <form onSubmit={handleAnswerSubmit}>
          {question.type === 'multiple_choice' ? (
            <fieldset className="choice-list" disabled={isAnswered || isSavingAnswer}>
              <legend className="sr-only">Choose one answer</legend>
              {(question.choices ?? []).map((choice, index) => (
                <label
                  className={`choice-option${draft.choiceId === choice.id ? ' selected' : ''}`}
                  key={choice.id}
                >
                  <input
                    checked={draft.choiceId === choice.id}
                    name={`question-${question.id}`}
                    onChange={() => updateDraft({ choiceId: choice.id })}
                    type="radio"
                    value={choice.id}
                  />
                  <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                  <span>{choice.text}</span>
                </label>
              ))}
              {(question.choices ?? []).length === 0 && (
                <p className="field-hint">No answer choices were provided for this question.</p>
              )}
            </fieldset>
          ) : (
            <div className="field answer-field">
              <label className="field-label" htmlFor="answer-text">
                {question.type === 'code_output' ? 'What output do you expect?' : 'Your answer'}
              </label>
              <textarea
                disabled={isAnswered || isSavingAnswer}
                id="answer-text"
                maxLength={1000}
                onChange={(event) => updateDraft({ text: event.target.value })}
                placeholder={
                  question.type === 'code_output'
                    ? 'Write the output you expect…'
                    : 'Share your reasoning…'
                }
                rows={question.type === 'code_output' ? 5 : 4}
                value={draft.text}
              />
              {question.type === 'code_output' && (
                <p className="field-hint">Enter your prediction as text. Code is never executed.</p>
              )}
              <span className="character-count">{draft.text.length} / 1000</span>
            </div>
          )}

          {answerError && <ApiErrorNotice message={answerError} title={answerErrorTitle} />}
          {finishError && <ApiErrorNotice message={finishError} title="Session not finished" />}
          {isAnswered && (
            <div className="saved-state" role="status">
              <span aria-hidden="true">✓</span> Answer saved
            </div>
          )}

          <div className="question-actions">
            <div className="question-nav">
              <button
                className="secondary-button"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((index) => index - 1)
                  setAnswerError('')
                }}
                type="button"
              >
                ← Previous
              </button>
              <button
                className="secondary-button"
                disabled={currentIndex === questions.length - 1}
                onClick={() => {
                  setCurrentIndex((index) => index + 1)
                  setAnswerError('')
                }}
                type="button"
              >
                Next →
              </button>
            </div>
            <div className="answer-actions">
              {!isAnswered && (
                <button className="primary-button" disabled={isSavingAnswer} type="submit">
                  {isSavingAnswer ? 'Saving…' : 'Save answer'}
                  {!isSavingAnswer && <span aria-hidden="true">→</span>}
                </button>
              )}
              <button
                className="finish-button"
                disabled={isFinishing}
                onClick={handleFinish}
                type="button"
              >
                {isFinishing ? 'Finishing…' : 'Finish session'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <p className="interview-footnote">
        Your timer is based on the session deadline. The server verifies every answer and decides when the session ends.
      </p>
    </div>
  )
}
