/**
 * Interview Detail Page (/interviews/:id)
 * Previews interview outline and questions before taking it.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { InterviewDetail } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Clock,
  Play,
  Edit3,
  HelpCircle,
  FileQuestion,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface InterviewDetailPageProps {
  id: number;
  navigate: (route: string) => void;
}

export function InterviewDetailPage({ id, navigate }: InterviewDetailPageProps) {
  const { user, isAdmin } = useAuth();
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getInterviewById(id);
        setInterview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStart = async () => {
    try {
      setStarting(true);
      setError(null);
      const attempt = await api.startAttempt(id);
      navigate(`/attempts/${attempt.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to begin interview attempt');
      setStarting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading interview details...</div>;
  }

  if (error || !interview) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-100">Interview Track Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'This interview does not exist.'}</p>
          <button
            onClick={() => navigate('/interviews')}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
          >
            Back to Interviews
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === interview.ownerId;
  const canManage = isOwner || isAdmin;
  const mins = Math.floor(interview.timeLimitSeconds / 60);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/interviews')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>

        {canManage && (
          <button
            onClick={() => navigate(`/interviews/${interview.id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Track
          </button>
        )}
      </div>

      {/* Main Track Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="capitalize font-medium text-slate-300">{interview.category}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`capitalize font-medium ${
                interview.difficulty === 'easy'
                  ? 'text-emerald-400'
                  : interview.difficulty === 'medium'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {interview.difficulty}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-300">{interview.questionCount} Questions</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-indigo-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {mins} minutes total
            </span>
            <span aria-hidden="true">·</span>
            <span>By @{interview.ownerUsername}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {interview.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {interview.description || 'No description provided.'}
          </p>
        </div>

        {/* Start Action Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">Ready to begin?</p>
            <p>
              Once you start, the {mins}-minute countdown begins. Questions are frozen in a snapshot and scored deterministically.
            </p>
          </div>

          <button
            onClick={handleStart}
            disabled={starting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{starting ? 'Initializing Attempt...' : 'Start Interview Now'}</span>
          </button>
        </div>
      </div>

      {/* Question Outline Preview (Safe version - Contract Section 6) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <FileQuestion className="w-4 h-4 text-indigo-400" />
          Included Questions Preview ({interview.questions.length})
        </h3>

        <div className="space-y-2.5">
          {interview.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex items-start gap-3"
            >
              <span className="font-mono text-xs font-bold text-indigo-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                Q{idx + 1}
              </span>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="capitalize">{q.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{q.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {q.type === 'multiple_choice'
                      ? 'Multiple Choice'
                      : q.type === 'short_answer'
                      ? 'Short Answer'
                      : 'Code Output'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200">{q.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
