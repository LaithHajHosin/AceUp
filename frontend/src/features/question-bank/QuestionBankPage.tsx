import { useState, useEffect } from "react";
import { getQuestions } from "../../api/questions";
import type { PublicQuestion, Difficulty, QuestionType } from "../../types/api";
import { getErrorMessage } from "../../api/client";

function QuestionBankPage() {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | null>(
    null,
  );
  const [typeFilter, setTypeFilter] = useState<QuestionType | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getQuestions({
          category: categoryFilter || undefined,
          difficulty: difficultyFilter || undefined,
          type: typeFilter || undefined,
        });

        setQuestions(response.items);
      } catch (error) {
        setError(getErrorMessage(error, "Failed to load questions."));
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [categoryFilter, difficultyFilter, typeFilter]);

  return (
    <section>
      <h1>Question Bank</h1>
      <p>Browse available interview questions.</p>

      <div>
        <input
          type="text"
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />

        <select
          value={difficultyFilter || ""}
          onChange={(e) =>
            setDifficultyFilter(
              e.target.value ? (e.target.value as Difficulty) : null,
            )
          }
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={typeFilter || ""}
          onChange={(e) =>
            setTypeFilter(
              e.target.value ? (e.target.value as QuestionType) : null,
            )
          }
        >
          <option value="">All Types</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="short_answer">Short Answer</option>
          <option value="code_output">Code Output</option>
        </select>
      </div>

      {loading ? (
        <p>Loading questions...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <>
          {questions.length === 0 ? (
            <p>No questions available.</p>
          ) : (
            <p>Found {questions.length} questions.</p>
          )}

          {questions.map((question) => (
            <div key={question.id}>
              <h2>{question.prompt}</h2>
              <p>Category: {question.category}</p>
              <p>Difficulty: {question.difficulty}</p>
              <p>Type: {question.type}</p>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

export default QuestionBankPage;
