import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createInterview, getInterview, updateInterview } from "./api";
import { QuestionPicker } from "./QuestionPicker";
import type { Difficulty, InterviewInput } from "./types";

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

export function InterviewFormPage() {
  const { id } = useParams();
  const interviewId = id ? Number(id) : null;
  const editing =
    interviewId !== null && Number.isInteger(interviewId) && interviewId > 0;
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(600);
  const [questionIds, setQuestionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing || !interviewId) return;
    getInterview(interviewId)
      .then((interview) => {
        if (interview.ownerId !== getUserId()) {
          setError("Only the interview owner can edit it.");
          return;
        }
        setTitle(interview.title);
        setDescription(interview.description);
        setCategory(interview.category);
        setDifficulty(interview.difficulty);
        setTimeLimitSeconds(interview.timeLimitSeconds);
        setQuestionIds(interview.questions.map((question) => question.id));
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Could not load interview.",
        ),
      )
      .finally(() => setLoading(false));
  }, [editing, interviewId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (title.trim().length < 3 || title.trim().length > 100) {
      setError("Title must be between 3 and 100 characters.");
      return;
    }
    if (description.length > 1000) {
      setError("Description cannot exceed 1000 characters.");
      return;
    }
    if (category.trim().length < 2 || category.trim().length > 40) {
      setError("Category must be between 2 and 40 characters.");
      return;
    }
    if (questionIds.length < 1 || questionIds.length > 20) {
      setError("Select between 1 and 20 questions.");
      return;
    }
    if (timeLimitSeconds < 30 || timeLimitSeconds > 3600) {
      setError("Time limit must be between 30 and 3600 seconds.");
      return;
    }

    const input: InterviewInput = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      questionIds,
      timeLimitSeconds,
    };

    setSaving(true);
    try {
      const saved =
        editing && interviewId
          ? await updateInterview(interviewId, input)
          : await createInterview(input);
      navigate(`/interviews/${saved.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save interview.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading interview...</p>;

  return (
    <section className="feature-page">
      <p className="eyebrow">Interview builder</p>
      <h1>{editing ? "Edit interview" : "Create interview"}</h1>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      <form className="feature-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            maxLength={100}
            required
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
          />
        </label>
        <label>
          Category
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label>
          Time limit (seconds)
          <input
            type="number"
            min={30}
            max={3600}
            value={timeLimitSeconds}
            onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
            required
          />
        </label>

        <QuestionPicker selectedIds={questionIds} onChange={setQuestionIds} />

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save interview"}
          </button>
          <Link to="/interviews">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
