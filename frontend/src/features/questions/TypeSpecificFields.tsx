import type { QuestionChoice, QuestionType } from "./types";

interface Props {
  type: QuestionType;
  choices: QuestionChoice[];
  setChoices: (value: QuestionChoice[]) => void;
  keywords: string[];
  setKeywords: (value: string[]) => void;
  requiredKeywordCount: number;
  setRequiredKeywordCount: (value: number) => void;
  codeSnippet: string;
  setCodeSnippet: (value: string) => void;
  expectedOutput: string;
  setExpectedOutput: (value: string) => void;
}

export function TypeSpecificFields(props: Props) {
  const {
    type,
    choices,
    setChoices,
    keywords,
    setKeywords,
    requiredKeywordCount,
    setRequiredKeywordCount,
    codeSnippet,
    setCodeSnippet,
    expectedOutput,
    setExpectedOutput,
  } = props;

  function updateChoice(index: number, patch: Partial<QuestionChoice>) {
    setChoices(
      choices.map((choice, i) =>
        i === index ? { ...choice, ...patch } : choice,
      ),
    );
  }

  function addChoice() {
    if (choices.length >= 6) return;
    setChoices([
      ...choices,
      { id: `c${Date.now()}`, text: "", isCorrect: false },
    ]);
  }

  function removeChoice(index: number) {
    if (choices.length <= 2) return;
    setChoices(choices.filter((_, i) => i !== index));
  }

  function updateKeyword(index: number, value: string) {
    setKeywords(keywords.map((keyword, i) => (i === index ? value : keyword)));
  }

  return (
    <div className="type-specific-fields">
      {type === "multiple_choice" && (
        <fieldset>
          <legend>Answer choices (2–6)</legend>
          <p>Select exactly one correct answer.</p>
          {choices.map((choice, index) => (
            <div className="choice-editor" key={choice.id}>
              <input
                aria-label={`Choice ${index + 1}`}
                value={choice.text}
                onChange={(e) => updateChoice(index, { text: e.target.value })}
                placeholder={`Choice ${index + 1}`}
                required
              />
              <label>
                <input
                  type="radio"
                  name="correct-choice"
                  checked={choice.isCorrect === true}
                  onChange={() =>
                    setChoices(
                      choices.map((item, i) => ({
                        ...item,
                        isCorrect: i === index,
                      })),
                    )
                  }
                />
                Correct
              </label>
              <button
                type="button"
                disabled={choices.length <= 2}
                onClick={() => removeChoice(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={choices.length >= 6}
            onClick={addChoice}
          >
            Add choice
          </button>
        </fieldset>
      )}

      {type === "short_answer" && (
        <fieldset>
          <legend>Expected keywords (2–6)</legend>
          <p>Add the keywords used to assess a short answer.</p>
          {keywords.map((keyword, index) => (
            <div className="choice-editor" key={index}>
              <input
                value={keyword}
                onChange={(e) => updateKeyword(index, e.target.value)}
                placeholder={`Keyword ${index + 1}`}
                required
              />
              <button
                type="button"
                disabled={keywords.length <= 2}
                onClick={() => {
                  const next = keywords.filter((_, i) => i !== index);
                  setKeywords(next);
                  setRequiredKeywordCount(
                    Math.min(requiredKeywordCount, next.length),
                  );
                }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={keywords.length >= 6}
            onClick={() => setKeywords([...keywords, ""])}
          >
            Add keyword
          </button>
          <label>
            Minimum keywords required
            <input
              type="number"
              min={1}
              max={keywords.length}
              value={requiredKeywordCount}
              onChange={(e) => setRequiredKeywordCount(Number(e.target.value))}
              required
            />
          </label>
        </fieldset>
      )}

      {type === "code_output" && (
        <fieldset>
          <legend>Code output</legend>
          <label>
            Code snippet
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              maxLength={5000}
              rows={6}
            />
          </label>
          <label>
            Expected output
            <textarea
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              required
              rows={3}
            />
          </label>
        </fieldset>
      )}
    </div>
  );
}
