import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { deleteQuestion, getQuestion } from "./api";
import type { OwnerQuestion, PublicQuestion } from "./types";

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

export function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<
    OwnerQuestion | PublicQuestion | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const questionId = Number(id);
    if (!Number.isInteger(questionId) || questionId < 1) {
      setError("Invalid question ID.");
      setLoading(false);
      return;
    }

    getQuestion(questionId)
      .then(setQuestion)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Could not load question.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!question || !window.confirm("Delete this question?")) return;
    try {
      await deleteQuestion(question.id);
      navigate("/questions");
    } catch (err) {
      if (err instanceof ApiError && err.code === "QUESTION_IN_USE") {
        setError(
          "This question is in use by an interview or attempt and cannot be deleted.",
        );
      } else if (err instanceof ApiError && err.code === "NOT_OWNER") {
        setError("Only the owner can delete this question.");
      } else {
        setError(
          err instanceof Error ? err.message : "Could not delete question.",
        );
      }
    }
  }

  if (loading) return <p>Loading question...</p>;
  if (!question) {
    return (
      <section className="feature-page">
        <h1>Question unavailable</h1>
        <p>{error || "Question not found."}</p>
        <Link to="/questions">Back to questions</Link>
      </section>
    );
  }

  const isOwner = question.ownerId === getUserId();
  const ownerQuestion = question as OwnerQuestion;
  const hasOwnerData = isOwner && "expectedKeywords" in question;

  return (
    <section className="feature-page">
      <Link to="/questions">← All questions</Link>
      <div className="question-card-meta">
        <span>{question.category}</span>
        <span>{question.difficulty}</span>
        <span>{question.type.replace(/_/g, " ")}</span>
      </div>
      <h1>{question.prompt}</h1>
      <p>
        Created by{" "}
        <Link to={`/users/${question.ownerId}`}>{question.ownerUsername}</Link>
      </p>

      {question.type === "multiple_choice" && question.choices && (
        <ol>
          {question.choices.map((choice) => (
            <li key={choice.id}>
              {choice.text}
              {hasOwnerData && choice.isCorrect && (
                <strong> — Correct answer</strong>
              )}
            </li>
          ))}
        </ol>
      )}

      {question.type === "code_output" && question.codeSnippet && (
        <pre>
          <code>{question.codeSnippet}</code>
        </pre>
      )}

      {hasOwnerData && question.type === "short_answer" && (
        <div>
          <h2>Expected keywords</h2>
          <ul>
            {ownerQuestion.expectedKeywords?.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
          <p>Required keyword count: {ownerQuestion.requiredKeywordCount}</p>
        </div>
      )}

      {hasOwnerData && question.type === "code_output" && (
        <p>
          Expected output: <code>{ownerQuestion.expectedOutput}</code>
        </p>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {isOwner && (
        <div className="form-actions">
          <Link to={`/questions/${question.id}/edit`}>Edit question</Link>
          <button type="button" onClick={handleDelete}>
            Delete question
          </button>
        </div>
      )}
    </section>
  );
}
