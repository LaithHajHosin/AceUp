import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { deleteQuestion, getQuestions } from "./api";
import { QuestionCard } from "./QuestionCard";
import type { Difficulty, PublicQuestion, QuestionType } from "./types";

function currentUserId(): number | null {
  try {
    const user = JSON.parse(
      localStorage.getItem("preppressure.user") || "null",
    );
    return typeof user?.id === "number" ? user.id : null;
  } catch {
    return null;
  }
}

export function QuestionsListPage() {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [type, setType] = useState<QuestionType | "">("");
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadQuestions() {
    setLoading(true);
    setError("");
    try {
      const items = await getQuestions({
        category: category.trim() || undefined,
        difficulty: difficulty || undefined,
        type: type || undefined,
        search: search.trim() || undefined,
        ownerId: mineOnly ? (currentUserId() ?? undefined) : undefined,
      });
      setQuestions(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load questions.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQuestions();
    // Load when filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty, type, search, mineOnly]);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this question? This action cannot be undone."))
      return;
    setNotice("");
    try {
      await deleteQuestion(id);
      setQuestions((items) => items.filter((item) => item.id !== id));
      setNotice("Question deleted.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUESTION_IN_USE") {
        setError(
          "This question is used by an interview or attempt and cannot be deleted.",
        );
      } else if (err instanceof ApiError && err.code === "NOT_OWNER") {
        setError("Only the question owner can delete it.");
      } else {
        setError(
          err instanceof Error ? err.message : "Could not delete question.",
        );
      }
    }
  }

  const userId = currentUserId();

  return (
    <section className="feature-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Question library</p>
          <h1>Questions</h1>
          <p>Browse questions or create your own practice material.</p>
        </div>
        <Link className="primary-button" to="/questions/new">
          Create question
        </Link>
      </header>

      <div className="filter-panel">
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
          />
        </label>
        <label>
          Category
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. javascript"
          />
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label>
          Question type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType | "")}
          >
            <option value="">All types</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
            <option value="code_output">Code output</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
          />
          My questions only
        </label>
      </div>

      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading questions...</p>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <h2>No questions found</h2>
          <p>Try changing the filters or create a new question.</p>
        </div>
      ) : (
        <div className="question-list">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              isOwner={userId !== null && question.ownerId === userId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
