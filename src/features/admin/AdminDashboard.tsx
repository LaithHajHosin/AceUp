/**
 * Admin Role-Based Data Management Console (/admin)
 * Provides administrators with system-wide oversight:
 * - User role management (Promote/Demote between Admin, Author, Candidate)
 * - Platform-wide attempt analytics and readiness benchmarks
 * - System maintenance and seed data reset controls
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ShieldCheck,
  Users,
  Code2,
  Layers,
  Activity,
  Award,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  navigate: (route: string) => void;
}

export function AdminDashboard({ navigate }: AdminDashboardProps) {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'attempts' | 'system'>('users');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin console data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      setError(null);
      await api.updateUserRole(userId, newRole);
      setSuccessMsg(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleResetSeeds = async () => {
    if (!window.confirm('Reset database back to the 40+ seed questions and initial tracks?')) {
      return;
    }
    try {
      setLoading(true);
      await api.resetSeeds();
      setSuccessMsg('Database refreshed to original 40+ seed questions and tracks!');
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to reset seeds');
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Administrator Access Required</h2>
        <p className="text-xs text-slate-400">
          Your account does not possess administrative privileges. Please log in as an administrator or request access from the system lead.
        </p>
        <button
          onClick={() => navigate('/interviews')}
          className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
        >
          Return to Interviews
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading admin dashboard...</div>;
  }

  const metrics = data?.metrics || {};
  const usersList = (data?.users || []).filter((u: any) => {
    if (!userSearch) return true;
    const sub = userSearch.toLowerCase();
    return u.username.toLowerCase().includes(sub) || u.displayName.toLowerCase().includes(sub) || u.email.toLowerCase().includes(sub);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Role-Based Data Management Console
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Supervise platform users, assign authorization roles, inspect candidate attempts, and monitor question bank integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            Open Swagger /docs
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={fetchOverview}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level System Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Total Users</span>
          <div className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            {metrics.totalUsers}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Question Bank</span>
          <div className="text-2xl font-bold text-indigo-400 font-mono mt-1 tabular-nums">
            {metrics.totalQuestions}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Active Tracks</span>
          <div className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            {metrics.totalInterviews}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Total Attempts</span>
          <div className="text-2xl font-bold text-white font-mono mt-1 tabular-nums">
            {metrics.totalAttempts}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Avg Candidate Score</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1 tabular-nums">
            {metrics.avgPercentage ? `${metrics.avgPercentage}%` : '—'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-medium text-slate-400">Ready Rating</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1 tabular-nums">
            {metrics.readinessBreakdown?.ready || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit text-xs font-medium">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          User Permissions & Roles ({data?.users?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('attempts')}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTab === 'attempts' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Candidate Attempts ({data?.attempts?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTab === 'system' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          System Controls
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-200">
              Platform Registered Users
            </h3>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Questions Authored</th>
                  <th className="py-2.5 px-3">Attempts Taken</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {usersList.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{u.displayName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">@{u.username} (ID: {u.id})</div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {u.questionsCreated}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {u.attemptsTaken}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                      >
                        <option value="user">User (Candidate)</option>
                        <option value="author">Author (Contributor)</option>
                        <option value="admin">Admin (Full Access)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/users/${u.id}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: All Attempts */}
      {activeTab === 'attempts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Platform-Wide Candidate Attempts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Attempt ID</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Interview Track</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Readiness</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(data?.attempts || []).map((att: any) => (
                  <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">
                      #{att.id}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{att.displayName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">@{att.username}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      {att.interviewTitle}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`capitalize font-medium ${
                          att.status === 'finished'
                            ? 'text-emerald-400'
                            : att.status === 'timed_out'
                            ? 'text-amber-400'
                            : 'text-indigo-400'
                        }`}
                      >
                        {att.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {att.score !== null ? `${att.score} / ${att.maxScore} (${att.percentage}%)` : '—'}
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-400">
                      {att.readiness ? att.readiness.replace('_', ' ') : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {att.status !== 'in_progress' ? (
                        <button
                          onClick={() => navigate(`/attempts/${att.id}/results`)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Results
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: System Controls */}
      {activeTab === 'system' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Database Seed Management</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              PrepPressure includes 40+ pre-seeded questions spanning React, TypeScript, Node.js, NestJS, MongoDB, Git, and Algorithms with full question types (Multiple Choice, Short Answer, Code Output), alongside demo candidate and author accounts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-200">Restore Original Seed Dataset</span>
              <p className="text-[11px] text-slate-400">
                Re-populates all 40+ verified questions and standard starter tracks.
              </p>
            </div>

            <button
              onClick={handleResetSeeds}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm"
            >
              Reset to 40+ Seeds
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
