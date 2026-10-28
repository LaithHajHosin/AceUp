/**
 * Attempts History Page (/attempts)
 * Lists all attempts taken by the current user with results, percentage, and readiness.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Attempt } from '../../types/index.js';
import { History, Play, CheckCircle2, AlertTriangle, ArrowRight, Clock, HelpCircle } from 'lucide-react';

interface AttemptsListPageProps {
  navigate: (route: string) => void;
}

export function AttemptsListPage({ navigate }: AttemptsListPageProps) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getAttempts({ status: statusFilter || undefined });
        setAttempts(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load attempts history');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            My Interview Attempts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review your past timed practice sessions, explanations, and score trends.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
          >
            <option value="">All Attempts</option>
            <option value="finished">Finished</option>
            <option value="timed_out">Timed Out</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading attempts...</div>
      ) : attempts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <HelpCircle className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No attempts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't completed any interviews yet. Pick an interview track to practice!
          </p>
          <button
            onClick={() => navigate('/interviews')}
            className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Browse Tracks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {attempts.map(a => {
            const isEnded = a.status === 'finished' || a.status === 'timed_out';
            const dateStr = new Date(a.startedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={a.id}
                className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  {/* Unboxed Metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-slate-500">Attempt #{a.id}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-medium capitalize ${
                        a.status === 'finished'
                          ? 'text-emerald-400'
                          : a.status === 'timed_out'
                          ? 'text-amber-400'
                          : 'text-indigo-400'
                      }`}
                    >
                      {a.status.replace('_', ' ')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{dateStr}</span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    {a.interviewTitle}
                  </h3>
                </div>

                {/* Score & Action */}
                <div className="flex items-center gap-5 shrink-0 self-end sm:self-center">
                  {isEnded && a.score !== null ? (
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white tabular-nums">
                        {a.score} / {a.maxScore}{' '}
                        <span className="text-xs text-indigo-400 font-normal">
                          ({a.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {a.readiness?.replace('_', ' ')}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 font-mono">In Progress</span>
                  )}

                  <button
                    onClick={() => {
                      if (a.status === 'in_progress') {
                        navigate(`/attempts/${a.id}`);
                      } else {
                        navigate(`/attempts/${a.id}/results`);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <span>{a.status === 'in_progress' ? 'Resume' : 'View Breakdown'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
