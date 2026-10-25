import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../api/client";
import { createQuestion, getQuestion, updateQuestion } from "./api";
import { TypeSpecificFields } from "./TypeSpecificFields";
import type {
  Difficulty,
  OwnerQuestion,
  QuestionChoice,
  QuestionInput,
  QuestionType,
} from "./types";

const initialChoices: QuestionChoice[] = [
  { id: "a", text: "", isCorrect: true },
  { id: "b", text: "", isCorrect: false },
];

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

export function QuestionFormPage() {
  const { id } = useParams();
  const questionId = id ? Number(id) : null;
  const editing =
    questionId !== null && Number.isInteger(questionId) && questionId > 0;
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [choices, setChoices] = useState<QuestionChoice[]>(initialChoices);
  const [keywords, setKeywords] = useState(["", ""]);
  const [requiredKeywordCount, setRequiredKeywordCount] = useState(1);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing || !questionId) return;

    getQuestion(questionId)
      .then((question) => {
        if (question.ownerId !== getUserId()) {
          setError("Only the question owner can edit this question.");
          return;
        }
        const ownerQuestion = question as OwnerQuestion;
        setPrompt(question.prompt);
        setCategory(question.category);
        setDifficulty(question.difficulty);
        setType(question.type);
        setChoices(
          ownerQuestion.choices?.map((choice) => ({ ...choice })) ??
            initialChoices,
        );
        setKeywords(ownerQuestion.expectedKeywords ?? ["", ""]);
        setRequiredKeywordCount(ownerQuestion.requiredKeywordCount ?? 1);
        setCodeSnippet(question.codeSnippet ?? "");
        setExpectedOutput(ownerQuestion.expectedOutput ?? "");
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Could not load question.",
        );
      })
      .finally(() => setLoading(false));
  }, [editing, questionId]);

  function buildInput(): QuestionInput {
    const base = {
      prompt: prompt.trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      type,
    };

    if (type === "multiple_choice") {
      return {
        ...base,
        choices: choices.map((choice) => ({
          id: choice.id.trim(),
          text: choice.text.trim(),
          isCorrect: choice.isCorrect === true,
        })),
      };
    }

    if (type === "short_answer") {
      return {
        ...base,
        expectedKeywords: keywords.map((word) => word.trim()).filter(Boolean),
        requiredKeywordCount,
      };
    }

    return {
      ...base,
      codeSnippet,
      expectedOutput: expectedOutput.trim(),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (prompt.trim().length < 5 || prompt.trim().length > 2000) {
      setError("The question prompt must be between 5 and 2000 characters.");
      return;
    }
    if (category.trim().length < 2 || category.trim().length > 40) {
      setError("Category must be between 2 and 40 characters.");
      return;
    }
    if (type === "multiple_choice") {
      if (choices.length < 2 || choices.length > 6) {
        setError("Add between 2 and 6 choices.");
        return;
      }
      if (choices.some((choice) => !choice.text.trim() || !choice.id.trim())) {
        setError("Every choice needs an ID and text.");
        return;
      }
      if (
        new Set(choices.map((choice) => choice.id.trim())).size !==
        choices.length
      ) {
        setError("Choice IDs must be unique.");
        return;
      }
      if (choices.filter((choice) => choice.isCorrect).length !== 1) {
        setError("Select exactly one correct choice.");
        return;
      }
    }
    if (type === "short_answer") {
      const validKeywords = keywords.map((word) => word.trim()).filter(Boolean);
      if (validKeywords.length < 2 || validKeywords.length > 6) {
        setError("Add between 2 and 6 non-empty keywords.");
        return;
      }
      if (
        requiredKeywordCount < 1 ||
        requiredKeywordCount > validKeywords.length
      ) {
        setError("The required keyword count is invalid.");
        return;
      }
    }
    if (type === "code_output" && !expectedOutput.trim()) {
      setError("Expected output is required.");
      return;
    }

    setSaving(true);
    try {
      const input = buildInput();
      const saved =
        editing && questionId
          ? await updateQuestion(questionId, input)
          : await createQuestion(input);
      navigate(`/questions/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_OWNER") {
        setError("Only the question owner can edit this question.");
      } else {
        setError(
          err instanceof Error ? err.message : "Could not save question.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading question...</p>;

  return (
    <section className="feature-page">
      <p className="eyebrow">Question library</p>
      <h1>{editing ? "Edit question" : "Create question"}</h1>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      <form className="feature-form" onSubmit={handleSubmit}>
        <label>
          Question prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            minLength={5}
            maxLength={2000}
            required
            rows={5}
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
          Question type
          <select
            value={type}
            disabled={editing}
            onChange={(e) => {
              const nextType = e.target.value as QuestionType;
              setType(nextType);
              if (nextType === "multiple_choice" && choices.length < 2)
                setChoices(initialChoices);
              if (nextType === "short_answer" && keywords.length < 2)
                setKeywords(["", ""]);
            }}
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
            <option value="code_output">Code output</option>
          </select>
        </label>

        <TypeSpecificFields
          type={type}
          choices={choices}
          setChoices={setChoices}
          keywords={keywords}
          setKeywords={setKeywords}
          requiredKeywordCount={requiredKeywordCount}
          setRequiredKeywordCount={setRequiredKeywordCount}
          codeSnippet={codeSnippet}
          setCodeSnippet={setCodeSnippet}
          expectedOutput={expectedOutput}
          setExpectedOutput={setExpectedOutput}
        />

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save question"}
          </button>
          <Link to="/questions">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
