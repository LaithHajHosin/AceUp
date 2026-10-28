/**
 * Profile & Statistics Page (/profile and /users/:id)
 * Follows Contract Section 4 & 7:
 * Renders user info, calculated statistics, and editable profile fields for own profile.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { User, UserStats } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  User as UserIcon,
  Award,
  Layers,
  Code2,
  CheckCircle2,
  Clock,
  Edit2,
  Save,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ProfilePageProps {
  userId?: number; // If not provided, loads current user
  navigate: (route: string) => void;
}

export function ProfilePage({ userId, navigate }: ProfilePageProps) {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const targetId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [profileData, setProfileData] = useState<{ user: User; stats: UserStats } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!targetId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getUserProfile(targetId);
        setProfileData(data);
        setEditDisplayName(data.user.displayName);
        setEditBio(data.user.bio || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [targetId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDisplayName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await api.updateMe({
        displayName: editDisplayName.trim(),
        bio: editBio.trim() ? editBio.trim() : null,
      });

      updateCurrentUser(updated);
      setProfileData(prev => (prev ? { ...prev, user: updated } : null));
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading user statistics...</div>;
  }

  if (error || !profileData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-100">User Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'This user profile does not exist.'}</p>
        </div>
      </div>
    );
  }

  const { user, stats } = profileData;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* User Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-2xl font-bold border border-indigo-500/30">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.displayName}
                </h1>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
            </div>
          </div>

          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-center"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Bio & Details */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Display Name (2-50 chars)
              </label>
              <input
                type="text"
                required
                value={editDisplayName}
                onChange={e => setEditDisplayName(e.target.value)}
                className="w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bio (Max 300 chars)
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Share your technical interests or career focus..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-2 text-xs text-slate-300 leading-relaxed max-w-2xl">
            {user.bio ? (
              <p>{user.bio}</p>
            ) : (
              <p className="text-slate-500 italic">No biographical information added yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Official Statistics Grid (Contract Section 7) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" />
          Candidate & Author Statistics
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Attempts Completed</span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {stats.attemptsCompleted}
            </div>
            <span className="text-[10px] text-slate-500">
              {stats.attemptsInProgress} currently in progress
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Average Score</span>
            <div className="text-2xl font-bold text-indigo-400 font-mono tabular-nums">
              {stats.averagePercentage !== null ? `${stats.averagePercentage}%` : '—'}
            </div>
            <span className="text-[10px] text-slate-500">Across ended attempts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Best Performance</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {stats.bestPercentage !== null ? `${stats.bestPercentage}%` : '—'}
            </div>
            <span className="text-[10px] text-slate-500">Peak interview score</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Questions Answered</span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {stats.questionsAnswered}
            </div>
            <span className="text-[10px] text-slate-500">Sum of submitted answers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Questions Authored</span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {stats.questionsCreated}
            </div>
            <span className="text-[10px] text-slate-500">Contributed to question bank</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Interviews Created</span>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">
              {stats.interviewsCreated}
            </div>
            <span className="text-[10px] text-slate-500">Curated practice tracks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
