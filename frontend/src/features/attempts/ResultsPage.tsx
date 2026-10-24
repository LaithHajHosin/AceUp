import { useParams } from 'react-router-dom'

export function ResultsPage() {
  const { id } = useParams()

  const results = [
    {
      question: 'What is the purpose of a closure in JavaScript?',
      submitted: 'To preserve variables in scope',
      expected: 'To preserve variables in scope',
      correct: true,
      explanation: 'Closures keep access to variables even after their outer function has returned.',
    },
    {
      question: 'Explain the difference between `let` and `var` in one senasdtence.',
      submitted: 'var is function-scoped and let is block-scoped.',
      expected: 'var is function-scoped and let is block-scoped.',
      correct: true,
      explanation: 'This answer correctly distinguishes the scope rules of the two declarations.',
    },
    {
      question: 'What does this code return: `return 2 + 2`?',
      submitted: '4',
      expected: '4',
      correct: true,
      explanation: 'The expression evaluates to the number 4.',
    },
  ]

  return (
    <div className="results-layout">
      <section className="profile-card">
        <div className="page-heading">
          <span className="eyebrow">Attempt results</span>
          <h1>Attempt #{id ?? '1'} is complete</h1>
        </div>

        <div className="results-summary">
          <div>
            <span>Score</span>
            <strong>3 / 3</strong>
          </div>
          <div>
            <span>Percentage</span>
            <strong>100%</strong>
          </div>
          <div>
            <span>Readiness</span>
            <strong>ready</strong>
          </div>
        </div>
      </section>

      <section className="question-card">
        <h2>Question-by-question breakdown</h2>
        {results.map((item, index) => (
          <div className="result-row" key={`${item.question}-${index}`}>
            <div className="result-status">{item.correct ? 'Correct' : 'Incorrect'}</div>
            <p><strong>Question:</strong> {item.question}</p>
            <p><strong>Submitted:</strong> {item.submitted}</p>
            <p><strong>Expected:</strong> {item.expected}</p>
            <p><strong>Explanation:</strong> {item.explanation}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
