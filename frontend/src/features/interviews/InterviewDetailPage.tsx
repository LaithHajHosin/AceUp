import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteInterview, getInterview } from "./api";
import type { InterviewDetail } from "./types";

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

export function InterviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const interviewId = Number(id);
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(interviewId) || interviewId < 1) {
      setError("Invalid interview ID.");
      setLoading(false);
      return;
    }

    getInterview(interviewId)
      .then(setInterview)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Could not load interview.",
        ),
      )
      .finally(() => setLoading(false));
  }, [interviewId]);

  async function handleDelete() {
    if (!interview || !window.confirm("Delete this interview?")) return;
    try {
      await deleteInterview(interview.id);
      navigate("/interviews");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete interview.",
      );
    }
  }

  if (loading) return <p>Loading interview...</p>;
  if (!interview)
    return (
      <section className="feature-page">
        <h1>Interview unavailable</h1>
        <p role="alert">{error || "Interview not found."}</p>
        <Link to="/interviews">Back to interviews</Link>
      </section>
    );

  const isOwner = interview.ownerId === getUserId();

  return (
    <section className="feature-page">
      <Link to="/interviews">← All interviews</Link>
      <div className="question-card-meta">
        <span>{interview.category}</span>
        <span>{interview.difficulty}</span>
        <span>{interview.questions.length} questions</span>
      </div>
      <h1>{interview.title}</h1>
      <p>{interview.description || "No description provided."}</p>
      <p>
        Created by{" "}
        <Link to={`/users/${interview.ownerId}`}>
          {interview.ownerUsername}
        </Link>
      </p>
      <p>
        Time limit: {Math.floor(interview.timeLimitSeconds / 60)} min{" "}
        {interview.timeLimitSeconds % 60
          ? `${interview.timeLimitSeconds % 60} sec`
          : ""}
      </p>

      <h2>Questions</h2>
      {interview.questions.length === 0 ? (
        <p>No questions are currently available.</p>
      ) : (
        <ol className="interview-question-list">
          {interview.questions.map((question) => (
            <li key={question.id}>
              <Link to={`/questions/${question.id}`}>{question.prompt}</Link>
              <small>
                {question.category} · {question.difficulty} ·{" "}
                {question.type.replace(/_/g, " ")}
              </small>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      <div className="form-actions">
        <Link
          className="primary-button"
          to={`/interviews/${interview.id}/take`}
        >
          Start interview
        </Link>
        {isOwner && (
          <>
            <Link to={`/interviews/${interview.id}/edit`}>Edit interview</Link>
            <button type="button" onClick={() => void handleDelete()}>
              Delete interview
            </button>
          </>
        )}
      </div>
    </section>
  );
}
