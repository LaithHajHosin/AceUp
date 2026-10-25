import { useEffect, useState } from "react";
import { getQuestionsForPicker } from "./api";
import type { PublicQuestion } from "./types";

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function QuestionPicker({ selectedIds, onChange }: Props) {
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    getQuestionsForPicker(search.trim())
      .then((data: PublicQuestion[]) => {
        if (!cancelled) {
          setQuestions(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load questions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search]);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else if (selectedIds.length < 20) {
      onChange([...selectedIds, id]);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...selectedIds];
    const target = index + direction;

    if (target < 0 || target >= next.length) {
      return;
    }

    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset>
      <legend>Interview questions (1–20)</legend>

      <label>
        Search questions
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search available questions..."
        />
      </label>

      <p>
        Selected: {selectedIds.length}/20. The order below is the interview
        order.
      </p>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="picker-question-list">
          {questions.map((question) => (
            <label className="picker-question" key={question.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(question.id)}
                disabled={
                  !selectedIds.includes(question.id) && selectedIds.length >= 20
                }
                onChange={() => toggle(question.id)}
              />

              <span>
                <strong>{question.prompt}</strong>
                <small>
                  {question.category} · {question.difficulty} ·{" "}
                  {question.type.replace(/_/g, " ")}
                </small>
              </span>
            </label>
          ))}
        </div>
      )}

      <ol className="selected-question-list">
        {selectedIds.map((id, index) => {
          const question = questions.find((item) => item.id === id);

          return (
            <li key={id}>
              <span>{question?.prompt ?? `Question #${id}`}</span>

              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Move up
              </button>

              <button
                type="button"
                disabled={index === selectedIds.length - 1}
                onClick={() => move(index, 1)}
              >
                Move down
              </button>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}
