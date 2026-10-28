/**
 * Attempt Result Page (/attempts/:id/results)
 * Follows Contract Section 6 & 7:
 * Displays total score, percentage, readiness level, and per-question explanation.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { AttemptResult } from '../../types/index.js';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  RotateCcw,
  User as UserIcon,
  AlertTriangle,
  Terminal,
} from 'lucide-react';

interface AttemptResultPageProps {
  attemptId: number;
  navigate: (route: string) => void;
}

export function AttemptResultPage({ attemptId, navigate }: AttemptResultPageProps) {
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      try {
        setLoading(true);
        const data = await api.getAttemptResults(attemptId);
        setResult(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load attempt results');
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [attemptId]);

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Evaluating deterministic score...</div>;
  }

  if (error || !result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-100">Unable to load result</h2>
          <p className="text-xs text-slate-400">{error || 'Result is not available yet.'}</p>
          <button
            onClick={() => navigate('/interviews')}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  const isTimedOut = result.status === 'timed_out';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/interviews')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <UserIcon className="w-3.5 h-3.5" />
            Profile & Stats
          </button>
        </div>
      </div>

      {/* Main Scorecard Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-slate-500">Attempt #{result.attemptId}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-medium ${
                  isTimedOut ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isTimedOut ? 'Timed Out (Deadline Reached)' : 'Completed Session'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {result.interviewTitle}
            </h1>
          </div>

          {/* Primary Score Counter */}
          <div className="flex items-center gap-6 sm:text-right shrink-0">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                {result.score}{' '}
                <span className="text-base sm:text-lg font-normal text-slate-500">
                  / {result.maxScore}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {result.percentage.toFixed(1)}% Score
              </div>
            </div>

            <div className="h-10 w-px bg-slate-800 hidden sm:block" />

            <div>
              <div
                className={`text-sm sm:text-base font-bold capitalize ${
                  result.readiness === 'ready'
                    ? 'text-emerald-400'
                    : result.readiness === 'almost_ready'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.readiness.replace('_', ' ')}
              </div>
              <div className="text-[11px] text-slate-500">
                {result.readiness === 'ready'
                  ? 'Benchmark: Ready (≥85%)'
                  : result.readiness === 'almost_ready'
                  ? 'Benchmark: Almost Ready (60-84%)'
                  : 'Benchmark: Needs Practice (<60%)'}
              </div>
            </div>
          </div>
        </div>

        {/* Explainability notice */}
        <p className="text-xs text-slate-400 leading-relaxed">
          Scores are generated strictly according to backend deterministic rules without subjective AI variance. Review the per-question analysis below to see exact keyword matches and correct answers.
        </p>
      </div>

      {/* Per-Question Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Per-Question Assessment ({result.items.length})
        </h3>

        <div className="space-y-3.5">
          {result.items.map(item => {
            const isFullCredit = item.points === item.maxPoints;
            const isHalfCredit = item.points > 0 && item.points < item.maxPoints;
            const isZero = item.points === 0;

            return (
              <div
                key={item.questionId}
                className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-slate-500">Q{item.position}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{item.type.replace('_', ' ')}</span>
                  </div>

                  {/* Points Badge */}
                  <div
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 ${
                      isFullCredit
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                        : isHalfCredit
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-800/60'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {isFullCredit ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isHalfCredit ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {item.points} / {item.maxPoints} pt
                    </span>
                  </div>
                </div>

                {/* Prompt */}
                <p className="text-sm font-semibold text-slate-100 leading-snug">
                  {item.prompt}
                </p>

                {/* Submitted vs Expected comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  {/* Candidate Submission */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-slate-400 font-medium">Your Submission:</span>
                    <p className="font-mono text-slate-200 break-words">
                      {item.submitted?.choiceId
                        ? `Option (${item.submitted.choiceId})`
                        : item.submitted?.text
                        ? item.submitted.text
                        : <span className="text-slate-500 italic">No answer submitted</span>}
                    </p>
                  </div>

                  {/* Expected Key */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                    <span className="text-slate-400 font-medium">Expected Key:</span>
                    <p className="font-mono text-indigo-300 break-words">
                      {item.expected.correctChoiceId
                        ? `Option (${item.expected.correctChoiceId})`
                        : item.expected.expectedKeywords
                        ? `Keywords: ${item.expected.expectedKeywords.join(', ')}`
                        : item.expected.expectedOutput
                        ? item.expected.expectedOutput
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-slate-400">Scoring Analysis:</strong> {item.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
