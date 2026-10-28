/**
 * Question Form Page (Create & Edit)
 * Implements Contract Section 5 rules for all 3 question types:
 * - multiple_choice: 2-6 choices, unique ids, exactly one isCorrect: true
 * - short_answer: 2-6 expectedKeywords, requiredKeywordCount 1..keywords.length
 * - code_output: codeSnippet (0-5000), expectedOutput (non-empty)
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { QuestionType, Difficulty } from '../../types/index.js';
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

interface QuestionFormPageProps {
  id?: number; // If provided, edit mode
  navigate: (route: string) => void;
}

interface ChoiceItem {
  id: string;
  text: string;
  isCorrect: boolean;
}

export function QuestionFormPage({ id, navigate }: QuestionFormPageProps) {
  const isEdit = typeof id === 'number';

  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('react');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [type, setType] = useState<QuestionType>('multiple_choice');

  // MC State
  const [choices, setChoices] = useState<ChoiceItem[]>([
    { id: 'a', text: '', isCorrect: true },
    { id: 'b', text: '', isCorrect: false },
  ]);

  // Short Answer State
  const [keywords, setKeywords] = useState<string[]>(['', '']);
  const [requiredKeywordCount, setRequiredKeywordCount] = useState<number>(1);

  // Code Output State
  const [codeSnippet, setCodeSnippet] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      async function loadExisting() {
        try {
          setLoading(true);
          const data = await api.getQuestionById(id!);
          setPrompt(data.prompt);
          setCategory(data.category);
          setDifficulty(data.difficulty);
          setType(data.type);

          if (data.type === 'multiple_choice' && data.choices) {
            setChoices(
              data.choices.map(c => ({
                id: c.id,
                text: c.text,
                isCorrect: !!c.isCorrect,
              }))
            );
          } else if (data.type === 'short_answer') {
            if (data.expectedKeywords) setKeywords(data.expectedKeywords);
            if (data.requiredKeywordCount) setRequiredKeywordCount(data.requiredKeywordCount);
          } else if (data.type === 'code_output') {
            if (data.codeSnippet) setCodeSnippet(data.codeSnippet);
            if (data.expectedOutput) setExpectedOutput(data.expectedOutput);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load question details');
        } finally {
          setLoading(false);
        }
      }
      loadExisting();
    }
  }, [id, isEdit]);

  // Handlers for MC Choices
  const handleAddChoice = () => {
    if (choices.length >= 6) return;
    const nextChar = String.fromCharCode(97 + choices.length); // a, b, c, d...
    setChoices([...choices, { id: nextChar, text: '', isCorrect: false }]);
  };

  const handleRemoveChoice = (index: number) => {
    if (choices.length <= 2) return;
    const updated = choices.filter((_, i) => i !== index);
    if (!updated.some(c => c.isCorrect) && updated.length > 0) {
      updated[0].isCorrect = true;
    }
    setChoices(updated);
  };

  const handleChoiceTextChange = (index: number, text: string) => {
    const updated = [...choices];
    updated[index].text = text;
    setChoices(updated);
  };

  const handleSelectCorrect = (index: number) => {
    const updated = choices.map((c, i) => ({
      ...c,
      isCorrect: i === index,
    }));
    setChoices(updated);
  };

  // Handlers for Short Answer Keywords
  const handleAddKeyword = () => {
    if (keywords.length >= 6) return;
    setKeywords([...keywords, '']);
  };

  const handleRemoveKeyword = (index: number) => {
    if (keywords.length <= 2) return;
    const updated = keywords.filter((_, i) => i !== index);
    setKeywords(updated);
    if (requiredKeywordCount > updated.length) {
      setRequiredKeywordCount(updated.length);
    }
  };

  const handleKeywordChange = (index: number, text: string) => {
    const updated = [...keywords];
    updated[index] = text;
    setKeywords(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Prompt check
    if (prompt.trim().length < 5 || prompt.trim().length > 2000) {
      setError('Question prompt must be between 5 and 2000 characters.');
      return;
    }

    // Build payload matching type
    const payload: any = {
      prompt: prompt.trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      type,
    };

    if (type === 'multiple_choice') {
      if (choices.some(c => !c.text.trim())) {
        setError('All multiple choice options must have non-empty text.');
        return;
      }
      if (!choices.some(c => c.isCorrect)) {
        setError('Exactly one choice must be marked as correct.');
        return;
      }
      payload.choices = choices.map(c => ({
        id: c.id.trim(),
        text: c.text.trim(),
        isCorrect: c.isCorrect,
      }));
    } else if (type === 'short_answer') {
      const validKeywords = keywords.map(k => k.trim()).filter(Boolean);
      if (validKeywords.length < 2 || validKeywords.length > 6) {
        setError('Short answer requires between 2 and 6 non-empty keywords.');
        return;
      }
      if (requiredKeywordCount < 1 || requiredKeywordCount > validKeywords.length) {
        setError(`Required match count must be between 1 and ${validKeywords.length}.`);
        return;
      }
      payload.expectedKeywords = validKeywords;
      payload.requiredKeywordCount = requiredKeywordCount;
    } else if (type === 'code_output') {
      if (!expectedOutput.trim()) {
        setError('Expected console output cannot be empty.');
        return;
      }
      payload.codeSnippet = codeSnippet;
      payload.expectedOutput = expectedOutput;
    }

    try {
      setLoading(true);
      if (isEdit && id) {
        await api.updateQuestion(id, payload);
      } else {
        await api.createQuestion(payload);
      }
      navigate('/questions');
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/questions')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel and return
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            {isEdit ? `Edit Question #${id}` : 'Create New Technical Question'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Questions can be selected into timed interview tracks and evaluated deterministically.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category & Difficulty & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. react, nodejs, algorithms"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="easy">Easy (1 pt)</option>
                <option value="medium">Medium (1 pt)</option>
                <option value="hard">Hard (1 pt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Question Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as QuestionType)}
                disabled={isEdit}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="short_answer">Short Answer</option>
                <option value="code_output">Code Output</option>
              </select>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Question Prompt (5-2000 chars)
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="State the technical question clearly..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          {/* Type-Specific Fields */}
          {type === 'multiple_choice' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Choices (2 to 6 choices)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Select the radio button next to the correct choice.
                  </p>
                </div>
                {choices.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddChoice}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Choice
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={choice.isCorrect}
                      onChange={() => handleSelectCorrect(idx)}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      title="Mark as correct answer"
                    />
                    <span className="font-mono text-xs text-slate-400 w-6 uppercase">
                      ({choice.id})
                    </span>
                    <input
                      type="text"
                      required
                      value={choice.text}
                      onChange={e => handleChoiceTextChange(idx, e.target.value)}
                      placeholder={`Choice ${choice.id} text...`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    {choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChoice(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'short_answer' && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Expected Keywords (2 to 6 keywords)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Case-insensitive matching. Scoring checks if candidate response contains these keywords.
                  </p>
                </div>
                {keywords.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Keyword
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {keywords.map((kw, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={kw}
                      onChange={e => handleKeywordChange(idx, e.target.value)}
                      placeholder={`Keyword ${idx + 1}`}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    {keywords.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Required Keyword Count for Full Credit:
                </label>
                <input
                  type="number"
                  min={1}
                  max={keywords.length}
                  value={requiredKeywordCount}
                  onChange={e => setRequiredKeywordCount(parseInt(e.target.value, 10))}
                  className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Matching $\ge$ {requiredKeywordCount} keyword(s) awards full credit (1.0 pt); matching at least 1 keyword awards half credit (0.5 pt).
                </p>
              </div>
            </div>
          )}

          {type === 'code_output' && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Code Snippet (Display-only, max 5000 chars)
                </label>
                <textarea
                  rows={4}
                  value={codeSnippet}
                  onChange={e => setCodeSnippet(e.target.value)}
                  placeholder="console.log(typeof null);"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Expected Console Output
                </label>
                <input
                  type="text"
                  required
                  value={expectedOutput}
                  onChange={e => setExpectedOutput(e.target.value)}
                  placeholder="e.g. object"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Whitespace is trimmed and newlines normalized during scoring.
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : isEdit ? 'Update Question' : 'Publish Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
