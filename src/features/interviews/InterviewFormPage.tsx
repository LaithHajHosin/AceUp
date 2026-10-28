/**
 * Interview Form Page (Create & Edit)
 * Implements Contract Section 6:
 * - title: 3-100 chars
 * - description: 0-1000 chars
 * - questionIds: 1-20 distinct integers that all exist
 * - timeLimitSeconds: 30-3600
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Question, Difficulty } from '../../types/index.js';
import { ArrowLeft, Save, AlertCircle, Check, Search, Layers } from 'lucide-react';

interface InterviewFormPageProps {
  id?: number;
  navigate: (route: string) => void;
}

export function InterviewFormPage({ id, navigate }: InterviewFormPageProps) {
  const isEdit = typeof id === 'number';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('react');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(10);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

  // Bank of questions to pick from
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankSearch, setBankSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setBankLoading(true);
        const allQuestions = await api.getQuestions();
        setAvailableQuestions(allQuestions);

        if (isEdit && id) {
          const existing = await api.getInterviewById(id);
          setTitle(existing.title);
          setDescription(existing.description || '');
          setCategory(existing.category);
          setDifficulty(existing.difficulty);
          setTimeLimitMinutes(Math.round(existing.timeLimitSeconds / 60));
          setSelectedQuestionIds(existing.questions ? existing.questions.map(q => q.id) : []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial data');
      } finally {
        setBankLoading(false);
      }
    }
    loadData();
  }, [id, isEdit]);

  const toggleQuestionSelection = (qId: number) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(prev => prev.filter(x => x !== qId));
    } else {
      if (selectedQuestionIds.length >= 20) {
        setError('Maximum 20 questions can be included in an interview.');
        return;
      }
      setSelectedQuestionIds(prev => [...prev, qId]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3 || title.trim().length > 100) {
      setError('Title must be between 3 and 100 characters.');
      return;
    }

    if (selectedQuestionIds.length < 1 || selectedQuestionIds.length > 20) {
      setError('You must select between 1 and 20 questions.');
      return;
    }

    const timeLimitSeconds = Math.max(30, Math.min(3600, timeLimitMinutes * 60));

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim().toLowerCase(),
      difficulty,
      questionIds: selectedQuestionIds,
      timeLimitSeconds,
    };

    try {
      setLoading(true);
      if (isEdit && id) {
        await api.updateInterview(id, payload);
      } else {
        await api.createInterview(payload);
      }
      navigate('/interviews');
    } catch (err: any) {
      setError(err.message || 'Failed to save interview track');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = availableQuestions.filter(q => {
    if (!bankSearch) return true;
    const sub = bankSearch.toLowerCase();
    return q.prompt.toLowerCase().includes(sub) || q.category.toLowerCase().includes(sub);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/interviews')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel and return
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            {isEdit ? `Edit Interview Track #${id}` : 'Create New Interview Track'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assemble 1 to 20 questions into a timed technical interview assessment.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Track Title (3-100 chars)
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. React Frontend Senior Engineer Simulation"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description (Optional, max 1000 chars)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief summary of skills and topics covered..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

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
                  placeholder="e.g. react, nodejs"
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
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={timeLimitMinutes}
                  onChange={e => setTimeLimitMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Question Selector */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Select Track Questions ({selectedQuestionIds.length} / 20 selected)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Choose between 1 and 20 questions from the question bank.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  placeholder="Filter question bank..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {bankLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading available questions...</div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-slate-800/80 rounded-xl p-2 bg-slate-950/40">
                {filteredQuestions.map(q => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestionSelection(q.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                        isSelected
                          ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-100'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-mono text-slate-500">#{q.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{q.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{q.difficulty}</span>
                          <span aria-hidden="true">·</span>
                          <span>{q.type.replace('_', ' ')}</span>
                        </div>
                        <p className="font-medium text-slate-200">{q.prompt}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading || selectedQuestionIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : isEdit ? 'Update Interview Track' : 'Create Interview Track'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
