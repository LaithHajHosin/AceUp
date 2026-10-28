/**
 * AceUp - Interview Tracks Simulation Arena (/interviews)
 * Visual Identity: Crimson & Titanium Cockpit Theme
 * Features:
 * - Timed full-length simulation track cards with countdown gauges
 * - Duration & difficulty filters
 * - Live simulation confirmation modal with urgency warning
 * - Clear role-based authoring actions
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { InterviewSummary } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Clock,
  Play,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Search,
  AlertCircle,
  HelpCircle,
  Flame,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

interface InterviewsPageProps {
  navigate: (route: string) => void;
}

export function InterviewsPage({ navigate }: InterviewsPageProps) {
  const { user, isAdmin } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [durationFilter, setDurationFilter] = useState<'all' | 'quick' | 'standard' | 'deep'>('all');

  const [startingId, setStartingId] = useState<number | null>(null);
  const [confirmStartTrack, setConfirmStartTrack] = useState<InterviewSummary | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getInterviews({
        search: search || undefined,
        category: category || undefined,
        difficulty: difficulty || undefined,
      });
      setInterviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load interview tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [category, difficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInterviews();
  };

  const handleStartAttempt = async (interviewId: number) => {
    try {
      setStartingId(interviewId);
      setError(null);
      const attempt = await api.startAttempt(interviewId);
      navigate(`/attempts/${attempt.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start simulation attempt');
      setStartingId(null);
      setConfirmStartTrack(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await api.deleteInterview(id);
      setInterviews(prev => prev.filter(i => i.id !== id));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete interview track');
      setDeleteConfirmId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins} mins` : `${mins}m ${secs}s`;
  };

  // Filtered by duration
  const filteredInterviews = interviews.filter(track => {
    if (durationFilter === 'quick') return track.timeLimitSeconds <= 600; // <= 10m
    if (durationFilter === 'standard') return track.timeLimitSeconds > 600 && track.timeLimitSeconds <= 1800; // 10-30m
    if (durationFilter === 'deep') return track.timeLimitSeconds > 1800; // > 30m
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Simulation Arena Hero Banner - High Impact Red & Dark Slate */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950/40 via-slate-900 to-[#0b0f19] border border-red-900/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-300 text-[11px] font-semibold tracking-wide uppercase">
              <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              AceUp Pressure Simulation Arena
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Timed Mock Interview Tracks
            </h1>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Step into a realistic interview simulation under real countdown pressure. Each track combines curated technical challenges, strict time constraints, locked submissions, and instant deterministic scoring.
            </p>

            {/* Quick Metrics Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400">Tracks:</span>
                <span className="font-bold text-white">{interviews.length} Ready</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Average Duration:</span>
                <span className="font-bold text-white">15-30 Mins</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                <span className="text-slate-400">Pass Mark:</span>
                <span className="font-bold text-white">70% Score</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => navigate('/interviews/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Author New Track
            </button>
            <button
              onClick={() => navigate('/questions')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/60 transition-colors"
            >
              Explore Question Bank
              <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Filter and Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3.5 backdrop-blur shadow-md">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tracks by role, title, or skills (e.g. Senior Frontend, NestJS)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          {/* Duration Quick Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs shrink-0">
            <button
              onClick={() => setDurationFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                durationFilter === 'all' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Durations
            </button>
            <button
              onClick={() => setDurationFilter('quick')}
              className={`px-3 py-1 rounded-md transition-colors ${
                durationFilter === 'quick' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sprint (&le;10m)
            </button>
            <button
              onClick={() => setDurationFilter('standard')}
              className={`px-3 py-1 rounded-md transition-colors ${
                durationFilter === 'standard' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard (10-30m)
            </button>
            <button
              onClick={() => setDurationFilter('deep')}
              className={`px-3 py-1 rounded-md transition-colors ${
                durationFilter === 'deep' ? 'bg-red-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Deep (30m+)
            </button>
          </div>
        </div>

        {/* Category & Difficulty Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Difficulty Level:</span>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-red-500 text-xs"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy (Entry / Junior)</option>
                <option value="medium">Medium (Mid-Level)</option>
                <option value="hard">Hard (Senior / Staff)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Category:</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 focus:outline-none focus:border-red-500 text-xs"
              >
                <option value="">All Categories</option>
                <option value="frontend">Frontend & UI</option>
                <option value="backend">Backend & Architecture</option>
                <option value="fullstack">Full-Stack</option>
                <option value="general">Engineering Core</option>
              </select>
            </div>
          </div>

          {(difficulty || category || search || durationFilter !== 'all') && (
            <button
              onClick={() => {
                setDifficulty('');
                setCategory('');
                setSearch('');
                setDurationFilter('all');
              }}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tracks Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2.5">
          <Clock className="w-5 h-5 text-red-500 animate-spin" />
          <span>Loading simulation tracks...</span>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No matching simulation tracks found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search filters or author a new customized interview track with selected questions.
          </p>
          <button
            onClick={() => navigate('/interviews/new')}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Create New Track
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInterviews.map(track => {
            const isOwner = user?.id === track.ownerId;
            const canManage = isOwner || isAdmin;
            const isStarting = startingId === track.id;

            return (
              <div
                key={track.id}
                className="group relative bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-red-600/50 hover:shadow-xl hover:shadow-red-950/20 transition-all flex flex-col justify-between gap-5"
              >
                {/* Track Card Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-red-950/80 border border-red-800/60 text-red-300">
                        TRACK #{track.id}
                      </span>
                      <span
                        className={`text-xs font-semibold capitalize ${
                          track.difficulty === 'easy'
                            ? 'text-emerald-400'
                            : track.difficulty === 'medium'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {track.difficulty} Difficulty
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formatDuration(track.timeLimitSeconds)}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {track.description || 'Full-scale simulated technical interview track with real-time countdown.'}
                    </p>
                  </div>

                  {/* Track Specifications */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Questions</div>
                      <div className="text-sm font-bold text-white font-mono mt-0.5">{track.questionCount} Questions</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Time Limit</div>
                      <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">{Math.floor(track.timeLimitSeconds / 60)} min</div>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Format</div>
                      <div className="text-sm font-bold text-indigo-300 font-mono mt-0.5 capitalize">{track.category || 'Tech'}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/interviews/${track.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => navigate(`/interviews/${track.id}/edit`)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Edit Track"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(track.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Track"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setConfirmStartTrack(track)}
                    disabled={isStarting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Simulation</span>
                  </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmId === track.id && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <h4 className="text-sm font-bold text-white">Delete this interview track?</h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      This removes "{track.title}". Historical completed candidate results will remain intact.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleDelete(track.id)}
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

      {/* Start Simulation Confirmation Modal */}
      {confirmStartTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-bold">
                  Simulation Arena Confirmation
                </span>
                <h3 className="text-lg font-bold text-white">
                  Start "{confirmStartTrack.title}"?
                </h3>
                <p className="text-xs text-slate-300">
                  You are about to launch a timed simulation session under AceUp pressure rules.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs space-y-2.5 text-slate-300">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Total Duration:</span>
                <span className="font-mono font-bold text-amber-300">{formatDuration(confirmStartTrack.timeLimitSeconds)}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Number of Questions:</span>
                <span className="font-mono font-bold text-white">{confirmStartTrack.questionCount} Questions</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Submission Rule:</span>
                <span className="text-red-400 font-semibold">Answers lock permanently once submitted</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Side Panel Navigation:</span>
                <span className="text-emerald-400 font-semibold">Active side panel for jumping between questions</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmStartTrack(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartAttempt(confirmStartTrack.id)}
                disabled={startingId !== null}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{startingId ? 'Starting...' : 'I am Ready, Begin Simulation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
