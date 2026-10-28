/**
 * Question Detail View (/questions/:id)
 * Follows Contract Section 5:
 * Answer keys (isCorrect, expectedKeywords, requiredKeywordCount, expectedOutput) are only returned
 * to the question's owner and admin on the question endpoints.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Question } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { ArrowLeft, Edit3, Lock, CheckCircle2, AlertCircle, Key, Terminal } from 'lucide-react';

interface QuestionDetailPageProps {
  id: number;
  navigate: (route: string) => void;
}

export function QuestionDetailPage({ id, navigate }: QuestionDetailPageProps) {
  const { user, isAdmin } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getQuestionById(id);
        setQuestion(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load question');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading question details...</div>;
  }

  if (error || !question) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-100">Question Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'This question does not exist.'}</p>
          <button
            onClick={() => navigate('/questions')}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
          >
            Back to Question Bank
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === question.ownerId;
  const canManage = isOwner || isAdmin;
  const hasAnswerKey = Boolean(
    question.choices?.some(c => c.isCorrect !== undefined) ||
    question.expectedKeywords ||
    question.expectedOutput
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/questions')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Question Bank
        </button>

        {canManage && (
          <button
            onClick={() => navigate(`/questions/${question.id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Question
          </button>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        {/* Unboxed Metadata (Zero-Pill) */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 border-b border-slate-800 pb-4">
          <span className="font-mono text-slate-500">#{question.id}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize font-medium text-slate-300">{question.category}</span>
          <span aria-hidden="true">·</span>
          <span
            className={`capitalize font-medium ${
              question.difficulty === 'easy'
                ? 'text-emerald-400'
                : question.difficulty === 'medium'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {question.difficulty} difficulty
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-300">
            {question.type === 'multiple_choice'
              ? 'Multiple Choice'
              : question.type === 'short_answer'
              ? 'Short Answer'
              : 'Code Output'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Authored by @{question.ownerUsername}</span>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
            {question.prompt}
          </h2>
        </div>

        {/* Code Snippet if applicable */}
        {question.codeSnippet && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Code Snippet:
            </span>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs font-mono text-indigo-200 overflow-x-auto">
              <pre>{question.codeSnippet}</pre>
            </div>
          </div>
        )}

        {/* Choices if Multiple Choice */}
        {question.type === 'multiple_choice' && question.choices && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400">Available Choices:</span>
            <div className="space-y-2">
              {question.choices.map(c => {
                const isCorrect = c.isCorrect;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      isCorrect
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-400 uppercase">
                        ({c.id})
                      </span>
                      <span>{c.text}</span>
                    </div>
                    {isCorrect && (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct Answer (Owner/Admin View)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Answer Key Disclosure Section */}
        {hasAnswerKey ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Key className="w-4 h-4" />
              Author & Admin Scoring Keys
            </div>

            {question.type === 'short_answer' && (
              <div className="text-xs space-y-1 text-slate-300">
                <p>
                  <strong className="text-slate-400">Expected Keywords:</strong>{' '}
                  <span className="font-mono text-indigo-300">
                    {question.expectedKeywords?.join(', ')}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-400">Required Match Count:</strong>{' '}
                  <span className="font-mono text-indigo-300">{question.requiredKeywordCount}</span>
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Full credit (1.0 pt) awarded if candidate uses $\ge$ {question.requiredKeywordCount} keyword(s); half credit (0.5 pt) if at least 1 keyword is matched.
                </p>
              </div>
            )}

            {question.type === 'code_output' && (
              <div className="text-xs space-y-1 text-slate-300">
                <p>
                  <strong className="text-slate-400">Expected Console Output:</strong>
                </p>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-300">
                  {question.expectedOutput}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-500 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
            <span>
              Scoring answer key is hidden for test integrity. Only the author (@{question.ownerUsername}) and administrators can view answers.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
