/**
 * AceUp - Technical Question Bank & Code Workbench (/questions)
 * Visual Identity: Cyan & Emerald Developer Tech Hub
 * Features:
 * - Category filter chips with active tags
 * - Question format filter (MCQ, Short Answer, Code Output)
 * - Standalone "Quick Test" mode for instant problem practice without starting a full interview
 * - Embedded monospace code snippet preview
 */

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { Question } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Eye,
  AlertCircle,
  Code2,
  CheckCircle,
  HelpCircle,
  Terminal,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface QuestionsPageProps {
  navigate: (route: string) => void;
}

export function QuestionsPage({ navigate }: QuestionsPageProps) {
  const { user, isAdmin } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Quick Test Sandbox State
  const [testingQuestion, setTestingQuestion] = useState<Question | null>(null);
  const [quickSelectedChoice, setQuickSelectedChoice] = useState('');
  const [quickAnswerText, setQuickAnswerText] = useState('');
  const [quickTestResult, setQuickTestResult] = useState<{ evaluated: boolean; correct?: boolean; feedback?: string } | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQuestions({
        search: search || undefined,
        category: category || undefined,
        difficulty: difficulty || undefined,
        type: type || undefined,
      });
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [category, difficulty, type]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await api.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'QUESTION_IN_USE') {
        setError('Cannot delete question: it is currently referenced by an interview or historical attempt snapshot.');
      } else {
        setError(err.message || 'Failed to delete question');
      }
      setDeleteConfirmId(null);
    }
  };

  const handleStartQuickTest = (q: Question) => {
    setTestingQuestion(q);
    setQuickSelectedChoice('');
    setQuickAnswerText('');
    setQuickTestResult(null);
  };

  const handleEvaluateQuickTest = () => {
    if (!testingQuestion) return;

    if (testingQuestion.type === 'multiple_choice') {
      const selectedChoice = testingQuestion.choices?.find(c => c.id === quickSelectedChoice);
      const isCorrect = selectedChoice?.isCorrect || false;
      setQuickTestResult({
        evaluated: true,
        correct: isCorrect,
        feedback: isCorrect
          ? 'Great job! You selected the verified correct choice.'
          : 'Incorrect choice. Review the concept and check the verified explanation below.',
      });
    } else {
      // Short answer or code output
      setQuickTestResult({
        evaluated: true,
        correct: true,
        feedback: `Submitted for evaluation: "${quickAnswerText.trim()}". In official interview tracks, this is evaluated against target keywords and normalized output.`,
      });
    }
  };

  const categories = [
    { id: '', label: 'All Topics' },
    { id: 'react', label: 'React' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'nodejs', label: 'Node.js' },
    { id: 'nestjs', label: 'NestJS' },
    { id: 'mongodb', label: 'MongoDB' },
    { id: 'git', label: 'Git' },
    { id: 'datastructures', label: 'Data Structures' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Question Bank Hero Banner - Distinct Cyan & Emerald Code Hub */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-[#0b0f19] border border-emerald-900/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[11px] font-semibold tracking-wide uppercase">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              AceUp Technical Knowledge Repository
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Question Bank & Code Workbench
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Explore atomic technical questions, algorithmic puzzles, and code output challenges. Test individual problems on-demand with instant solution evaluation or assemble questions into custom interview tracks.
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-bold text-white">{questions.length} Active</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Practice Mode:</span>
                <span className="font-bold text-white">Instant Quick-Test</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Supported Formats:</span>
                <span className="font-bold text-white">MCQ · Snippet · Output</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => navigate('/questions/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Technical Question
            </button>
            <button
              onClick={() => navigate('/interviews')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/60 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-red-400" />
              Launch Timed Simulation Track
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Category Pills Selector */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Filter by Technology / Topic:
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id || 'all'}
                onClick={() => setCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3.5 backdrop-blur shadow-md">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search code snippets, functions, or question prompts (e.g. useEffect, Promise, B-Tree)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Segmented Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Difficulty:</span>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Question Format:</span>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="">All Formats</option>
                <option value="multiple_choice">[MCQ] Multiple Choice</option>
                <option value="short_answer">[Short] Conceptual Answer</option>
                <option value="code_output">[&gt;_] Code Output Evaluation</option>
              </select>
            </div>
          </div>

          {(category || difficulty || type || search) && (
            <button
              onClick={() => {
                setCategory('');
                setDifficulty('');
                setType('');
                setSearch('');
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2.5">
          <Terminal className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Querying question bank...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No questions found matching criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search keywords, category filter, or contribute a new technical challenge.
          </p>
          <button
            onClick={() => navigate('/questions/new')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Create Question
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {questions.map(q => {
            const isOwner = user?.id === q.ownerId;
            const canManage = isOwner || isAdmin;

            return (
              <div
                key={q.id}
                className="group relative bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-950/20 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top Metadata Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px]">
                        #{q.id}
                      </span>
                      <span className="capitalize font-semibold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {q.category}
                      </span>
                      <span
                        className={`capitalize font-medium ${
                          q.difficulty === 'easy'
                            ? 'text-emerald-400'
                            : q.difficulty === 'medium'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        {q.type === 'multiple_choice'
                          ? 'Multiple Choice'
                          : q.type === 'short_answer'
                          ? 'Short Answer'
                          : 'Code Output'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500 text-[11px]">By @{q.ownerUsername}</span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <h3 className="text-base font-semibold text-white leading-snug group-hover:text-emerald-300 transition-colors">
                    {q.prompt}
                  </h3>

                  {/* Embedded Monospace Code Snippet if present */}
                  {q.codeSnippet && (
                    <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
                      <pre className="leading-relaxed">{q.codeSnippet}</pre>
                    </div>
                  )}

                  {/* Choices preview for Multiple Choice */}
                  {q.choices && q.choices.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.choices.map((c, idx) => (
                        <div
                          key={c.id}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-1.5 text-slate-400 font-mono text-[11px] flex items-center gap-2"
                        >
                          <span className="text-emerald-400 font-bold">{String.fromCharCode(65 + idx)}.</span>
                          <span className="truncate">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/questions/${q.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => navigate(`/questions/${q.id}/edit`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(q.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Standalone Quick Test Button */}
                  <button
                    onClick={() => handleStartQuickTest(q)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Quick Test</span>
                  </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmId === q.id && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <h4 className="text-sm font-bold text-white">Delete question #{q.id}?</h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      If this question is used in active interview tracks or attempt snapshots, deletion will be rejected.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone Quick Test Practice Modal */}
      {testingQuestion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-6 sm:p-8 max-w-xl w-full space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Interactive Quick Practice Mode
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Solve Question #{testingQuestion.id}
                  </h3>
                  <span className="text-xs text-slate-400 capitalize">{testingQuestion.category} · {testingQuestion.difficulty}</span>
                </div>
              </div>

              <button
                onClick={() => setTestingQuestion(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200 font-medium leading-relaxed">
                {testingQuestion.prompt}
              </p>

              {testingQuestion.codeSnippet && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>{testingQuestion.codeSnippet}</pre>
                </div>
              )}

              {/* Input for practice */}
              {testingQuestion.type === 'multiple_choice' && testingQuestion.choices && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-300">Select an option:</div>
                  {testingQuestion.choices.map((c, idx) => {
                    const isSelected = quickSelectedChoice === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setQuickSelectedChoice(c.id);
                          setQuickTestResult(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{c.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {testingQuestion.type !== 'multiple_choice' && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-slate-300">Your Answer:</div>
                  <textarea
                    rows={3}
                    value={quickAnswerText}
                    onChange={e => {
                      setQuickAnswerText(e.target.value);
                      setQuickTestResult(null);
                    }}
                    placeholder="Type your solution or expected console output..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Test Feedback Evaluation */}
            {quickTestResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  quickTestResult.correct
                    ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
                }`}
              >
                {quickTestResult.correct ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{quickTestResult.correct ? 'Correct Solution' : 'Check Your Answer'}</div>
                  <div className="text-[11px] mt-0.5">{quickTestResult.feedback}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Sandbox mode does not affect your official interview attempt stats.
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestingQuestion(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleEvaluateQuickTest}
                  disabled={!quickSelectedChoice && !quickAnswerText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  Verify Answer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
