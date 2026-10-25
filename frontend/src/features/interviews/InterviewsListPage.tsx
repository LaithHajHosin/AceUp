import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteInterview, getInterviews } from "./api";
import type { Difficulty, InterviewSummary } from "./types";

function getUserId(): number | null {
  try {
    const user = JSON.parse(
      localStorage.getItem("preppressure.user") || "null",
    );
    return typeof user?.id === "number" ? user.id : null;
  } catch {
    return null;
  }
}

export function InterviewsListPage() {
  const [items, setItems] = useState<InterviewSummary[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [mineOnly, setMineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getInterviews({
      search: search.trim() || undefined,
      category: category.trim() || undefined,
      difficulty: difficulty || undefined,
      ownerId: mineOnly ? (getUserId() ?? undefined) : undefined,
    })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Could not load interviews.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, category, difficulty, mineOnly]);

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this interview?")) return;
    setError("");
    try {
      await deleteInterview(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete interview.",
      );
    }
  }

  const userId = getUserId();

  return (
    <section className="feature-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Practice plans</p>
          <h1>Interviews</h1>
          <p>Browse and create interview sets.</p>
        </div>
        <Link className="primary-button" to="/interviews/new">
          Create interview
        </Link>
      </header>

      <div className="filter-panel">
        <label>
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search interviews..."
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
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
          />{" "}
          My interviews only
        </label>
      </div>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading interviews...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h2>No interviews found</h2>
          <p>Change the filters or create an interview.</p>
        </div>
      ) : (
        <div className="question-list">
          {items.map((item) => (
            <article className="question-card" key={item.id}>
              <div className="question-card-meta">
                <span>{item.category}</span>
                <span>{item.difficulty}</span>
                <span>{item.questionCount} questions</span>
              </div>
              <h2>
                <Link to={`/interviews/${item.id}`}>{item.title}</Link>
              </h2>
              <p>{item.description || "No description provided."}</p>
              <p>
                Created by{" "}
                <Link to={`/users/${item.ownerId}`}>{item.ownerUsername}</Link>
              </p>
              <p>
                Time limit: {Math.floor(item.timeLimitSeconds / 60)} min{" "}
                {item.timeLimitSeconds % 60
                  ? `${item.timeLimitSeconds % 60} sec`
                  : ""}
              </p>
              <div className="form-actions">
                <Link to={`/interviews/${item.id}`}>View details</Link>
                {item.ownerId === userId && (
                  <>
                    <Link to={`/interviews/${item.id}/edit`}>Edit</Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
