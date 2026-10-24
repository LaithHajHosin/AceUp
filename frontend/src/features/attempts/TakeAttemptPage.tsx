import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const sampleQuestions = [
  {
    id: 1,
    prompt: 'What is the purpose of a closure in JavaScript?',
    type: 'multiple_choice',
    choices: ['To read files', 'To preserve variables in scope', 'To optimize CSS'],
    answer: 'To preserve variables in scope',
  },
  {
    id: 2,
    prompt: 'Explain the difference between `let` and `var` in one sentence.',
    type: 'short_answer',
    answer: 'var is function-scoped and let is block-scoped.',
  },
  {
    id: 3,
    prompt: 'What does this code return: `return 2 + 2`?',
    type: 'code_output',
    answer: '4',
  },
] as const

export function TakeAttemptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [choice, setChoice] = useState('')
  const [shortAnswer, setShortAnswer] = useState('')
  const [codeOutput, setCodeOutput] = useState('')

  const question = sampleQuestions[currentIndex]
  const total = sampleQuestions.length

  function saveAndContinue() {
    if (currentIndex < total - 1) {
      setCurrentIndex((previous) => previous + 1)
      setChoice('')
      setShortAnswer('')
      setCodeOutput('')
      return
    }

    navigate(`/attempts/${id ?? '1'}/results`)
  }

  return (
    <div className="interview-layout">
      <header className="interview-header">
        <div>
          <span className="eyebrow">Live practice</span>
          <h1>Interview attempt #{id ?? '1'}</h1>
        </div>
        <span className="status-pill"><span /> {question.type.replace('_', ' ')}</span>
      </header>

      <section className="question-card">
        <div className="question-card-top">
          <span className="question-number">
            QUESTION <strong>{String(currentIndex + 1).padStart(2, '0')}</strong>
            <span> / {String(total).padStart(2, '0')}</span>
          </span>
        </div>

        <h2>{question.prompt}</h2>

        {question.type === 'multiple_choice' && (
          <div className="answer-choice-list">
            {question.choices.map((option) => (
              <label className="choice-option" key={option}>
                <input checked={choice === option} name="choice" onChange={() => setChoice(option)} type="radio" />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'short_answer' && (
          <textarea onChange={(event) => setShortAnswer(event.target.value)} rows={5} value={shortAnswer} />
        )}

        {question.type === 'code_output' && (
          <textarea onChange={(event) => setCodeOutput(event.target.value)} rows={6} value={codeOutput} />
        )}

        <div className="attempt-actions">
          <button className="primary-button" onClick={saveAndContinue} type="button">
            {currentIndex === total - 1 ? 'Finish interview' : 'Save and continue'}
          </button>
        </div>
      </section>
    </div>
  )
}
