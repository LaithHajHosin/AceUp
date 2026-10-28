/**
 * AceUp - Live Interview Simulation Runner (/attempts/:id)
 * Features:
 * - Dedicated Questions Navigation Side Panel (Desktop split panel + Mobile slideover drawer)
 * - Live countdown timer with deadline enforcement
 * - Single-answer locking (duplicate re-submission rejection)
 * - Jump between questions, next unanswered shortcut
 * - Full candidate review before deterministic finish
 */

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { Attempt, AttemptQuestion } from '../../types/index.js';
import { CountdownTimer } from '../../components/CountdownTimer.js';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  Flag,
  Clock,
  Terminal,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ChevronRight,
  Circle,
  HelpCircle,
} from 'lucide-react';

interface TakeInterviewPageProps {
  attemptId: number;
  navigate: (route: string) => void;
}

export function TakeInterviewPage({ attemptId, navigate }: TakeInterviewPageProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Side panel toggle state (desktop & mobile)
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Current question answer input state
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [answerText, setAnswerText] = useState<string>('');
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAttemptById(attemptId);
      setAttempt(data);

      if (data.status !== 'in_progress') {
        // Attempt already ended, route to results
        navigate(`/attempts/${attemptId}/results`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attempt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  // Reset local answer state when switching question
  useEffect(() => {
    setSelectedChoiceId('');
    setAnswerText('');
    setError(null);
  }, [currentIndex]);

  const handleTimeout = async () => {
    try {
      await api.getAttemptById(attemptId);
      navigate(`/attempts/${attemptId}/results`);
    } catch {
      navigate(`/attempts/${attemptId}/results`);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!attempt) return;
    const currentQ = attempt.questions[currentIndex];
    if (!currentQ) return;

    // Check duplicate
    if (attempt.answeredQuestionIds.includes(currentQ.questionId)) {
      setError('This question has already been answered. Under interview rules, answers are locked.');
      return;
    }

    let answerPayload: any;
    if (currentQ.type === 'multiple_choice') {
      if (!selectedChoiceId) {
        setError('Please select an option before submitting.');
        return;
      }
      answerPayload = { type: 'multiple_choice', choiceId: selectedChoiceId };
    } else if (currentQ.type === 'short_answer') {
      if (!answerText.trim()) {
        setError('Please provide an answer explanation before submitting.');
        return;
      }
      answerPayload = { type: 'short_answer', text: answerText.trim() };
    } else if (currentQ.type === 'code_output') {
      if (!answerText.trim()) {
        setError('Please provide expected console output before submitting.');
        return;
      }
      answerPayload = { type: 'code_output', text: answerText };
    }

    try {
      setSubmitting(true);
      setError(null);
      await api.submitAnswer(attempt.id, {
        questionId: currentQ.questionId,
        answer: answerPayload,
      });

      // Update local attempt state
      setAttempt(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          answeredQuestionIds: [...prev.answeredQuestionIds, currentQ.questionId],
        };
      });

      // Automatically advance to next unanswered question if available
      const nextUnansweredIdx = attempt.questions.findIndex(
        (q, idx) => idx > currentIndex && !attempt.answeredQuestionIds.includes(q.questionId)
      );

      if (nextUnansweredIdx !== -1) {
        setCurrentIndex(nextUnansweredIdx);
      } else if (currentIndex < attempt.questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err: any) {
      if (err instanceof ApiError && (err.code === 'ANSWER_LATE' || err.code === 'ATTEMPT_ENDED')) {
        navigate(`/attempts/${attempt.id}/results`);
      } else {
        setError(err.message || 'Failed to submit answer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!attempt) return;
    try {
      setFinishing(true);
      setError(null);
      await api.finishAttempt(attempt.id);
      navigate(`/attempts/${attempt.id}/results`);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'ATTEMPT_ENDED') {
        navigate(`/attempts/${attempt.id}/results`);
      } else {
        setError(err.message || 'Failed to finish attempt');
      }
      setFinishing(false);
    }
  };

  const jumpToNextUnanswered = () => {
    if (!attempt) return;
    const unansweredIdx = attempt.questions.findIndex(
      (q, idx) => !attempt.answeredQuestionIds.includes(q.questionId) && idx !== currentIndex
    );
    if (unansweredIdx !== -1) {
      setCurrentIndex(unansweredIdx);
      setMobileDrawerOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center text-slate-400 text-sm gap-3">
        <Clock className="w-5 h-5 text-red-500 animate-spin" />
        <span>Initializing simulation environment & timer...</span>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-100">Unable to load simulation attempt</h2>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={() => navigate('/interviews')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 font-semibold"
          >
            Back to Interview Arena
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const currentQuestion = attempt.questions[currentIndex];
  const isCurrentAnswered = attempt.answeredQuestionIds.includes(currentQuestion.questionId);
  const totalQuestions = attempt.questions.length;
  const answeredCount = attempt.answeredQuestionIds.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0b0f19] flex flex-col">
      {/* Top Session Status Bar */}
      <div className="sticky top-16 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Track Title & Mobile Panel Toggle */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(!mobileDrawerOpen);
                } else {
                  setSidePanelOpen(!sidePanelOpen);
                }
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono shrink-0"
              title="Toggle Questions Side Panel"
            >
              {sidePanelOpen ? <PanelLeftClose className="w-4 h-4 text-red-400" /> : <PanelLeft className="w-4 h-4 text-red-400" />}
              <span className="hidden sm:inline font-bold">
                {sidePanelOpen ? 'Hide Panel' : 'Questions List'}
              </span>
            </button>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-red-400 bg-red-950/80 px-2 py-0.2 rounded border border-red-800/60 hidden sm:inline">
                  SIMULATION #{attempt.id}
                </span>
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  {attempt.interviewTitle}
                </h1>
              </div>
            </div>
          </div>

          {/* Right: Live Countdown Timer & Finish Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <CountdownTimer deadlineAt={attempt.deadlineAt} onTimeout={handleTimeout} />
            </div>

            <button
              onClick={() => setShowFinishConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Flag className="w-3.5 h-3.5 fill-current" />
              <span>Finish Interview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Simulation Body: Side Panel + Active Question View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex gap-6">
        {/* DESKTOP SIDE PANEL (Collapsible) */}
        <aside
          className={`transition-all duration-300 shrink-0 hidden lg:flex flex-col ${
            sidePanelOpen ? 'w-80' : 'w-0 overflow-hidden opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-36 space-y-4 flex flex-col max-h-[calc(100vh-10rem)] shadow-xl">
            {/* Side Panel Header with Progress Gauge */}
            <div className="space-y-2 border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-red-500" />
                  Questions Navigator
                </span>
                <span className="font-mono text-xs font-bold text-red-400">
                  {answeredCount} / {totalQuestions} Answered
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-red-600 to-rose-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{progressPercent}% Complete</span>
                {answeredCount < totalQuestions && (
                  <button
                    onClick={jumpToNextUnanswered}
                    className="text-red-400 hover:text-red-300 font-semibold"
                  >
                    Next Unanswered &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Questions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {attempt.questions.map((q, idx) => {
                const isAnswered = attempt.answeredQuestionIds.includes(q.questionId);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative ${
                      isCurrent
                        ? 'bg-slate-800 border-red-500 text-white shadow-md shadow-red-950/40'
                        : isAnswered
                        ? 'bg-slate-950/70 border-emerald-900/50 text-slate-300 hover:border-emerald-700'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isAnswered ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-mono font-bold text-white">Q{idx + 1}</span>
                        <span className="text-[10px] uppercase font-mono text-slate-400 truncate capitalize">
                          {q.category}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate mt-0.5 text-slate-200">
                        {q.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span
                          className={`capitalize font-semibold ${
                            q.difficulty === 'easy'
                              ? 'text-emerald-400'
                              : q.difficulty === 'medium'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">
                          {isAnswered ? (
                            <span className="text-emerald-400 font-semibold">Locked</span>
                          ) : isCurrent ? (
                            <span className="text-red-400 font-semibold">Active Now</span>
                          ) : (
                            'Pending'
                          )}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 self-center text-slate-500 ${isCurrent ? 'text-red-400' : ''}`} />
                  </button>
                );
              })}
            </div>

            {/* Side Panel Footer Shortcuts */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Click any question to jump</span>
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="text-slate-400 hover:text-white font-medium text-[11px]"
              >
                Finish Early
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-80 max-w-[85%] bg-slate-900 border-r border-slate-800 p-5 flex flex-col h-full z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="font-bold text-white flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-red-500" />
                  Questions Navigator
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="py-3 border-b border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300 font-mono">
                  <span>Progress:</span>
                  <span className="text-red-400 font-bold">{answeredCount} of {totalQuestions} Answered</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-red-600 h-full rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {attempt.questions.map((q, idx) => {
                  const isAnswered = attempt.answeredQuestionIds.includes(q.questionId);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border text-xs flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-800 border-red-500 text-white'
                          : isAnswered
                          ? 'bg-slate-950 border-emerald-900/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isAnswered ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="font-mono font-bold">Q{idx + 1}</span>
                        <span className="truncate">{q.prompt}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setShowFinishConfirm(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                >
                  Finish Interview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN QUESTION WORKSPACE */}
        <main className="flex-1 min-w-0 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Active Question Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative">
            {/* Question Header & Category */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-red-400 bg-red-950/80 border border-red-800/60 px-2.5 py-1 rounded-lg">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="capitalize font-semibold text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {currentQuestion.category}
                </span>
                <span
                  className={`capitalize font-semibold ${
                    currentQuestion.difficulty === 'easy'
                      ? 'text-emerald-400'
                      : currentQuestion.difficulty === 'medium'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {currentQuestion.difficulty}
                </span>
              </div>

              <div className="text-slate-400 font-mono text-[11px] flex items-center gap-2">
                <span>1.0 Score Point</span>
                <span>·</span>
                <span>
                  {currentQuestion.type === 'multiple_choice'
                    ? 'Multiple Choice'
                    : currentQuestion.type === 'short_answer'
                    ? 'Short Answer'
                    : 'Code Output'}
                </span>
              </div>
            </div>

            {/* Prompt */}
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
              {currentQuestion.prompt}
            </h2>

            {/* Code Snippet if applicable */}
            {currentQuestion.codeSnippet && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-red-300 overflow-x-auto shadow-inner">
                <div className="text-[10px] text-slate-500 pb-2 border-b border-slate-800/80 mb-2 font-mono uppercase tracking-wider">
                  Technical Snippet
                </div>
                <pre className="leading-relaxed">{currentQuestion.codeSnippet}</pre>
              </div>
            )}

            {/* Answer Input Section */}
            {isCurrentAnswered ? (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 text-xs flex items-center gap-3.5 text-emerald-300 shadow-inner">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-200">Answer Locked & Recorded</div>
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    Your response for this question has been finalized under AceUp interview rules.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {currentQuestion.type === 'multiple_choice' && currentQuestion.choices && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Select Your Answer:
                    </span>
                    <div className="space-y-2.5">
                      {currentQuestion.choices.map((c, idx) => {
                        const isSelected = selectedChoiceId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedChoiceId(c.id)}
                            className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3.5 ${
                              isSelected
                                ? 'bg-red-950/40 border-red-500 text-white shadow-md shadow-red-950/40'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-red-500 bg-red-600' : 'border-slate-700 bg-slate-900'
                              }`}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="font-mono font-bold text-slate-400 text-xs">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className="leading-relaxed font-medium">{c.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentQuestion.type === 'short_answer' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Your Conceptual Explanation:
                    </label>
                    <textarea
                      rows={5}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder="Type your explanation using relevant technical terms (e.g. dependency injection, single-responsibility, closure)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-red-500 placeholder-slate-600 leading-relaxed font-mono"
                    />
                  </div>
                )}

                {currentQuestion.type === 'code_output' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Expected Console Output:
                    </label>
                    <input
                      type="text"
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder="e.g. 1 2 3 or undefined or [object Object]"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-red-500 placeholder-slate-600"
                    />
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-500">
                    ⚠️ Answers lock immediately upon submission.
                  </div>

                  <button
                    onClick={handleAnswerSubmit}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Locking Answer...' : 'Submit & Lock Answer'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Question</span>
            </button>

            <span className="text-xs font-mono text-slate-500">
              Q{currentIndex + 1} of {totalQuestions}
            </span>

            <button
              onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
              disabled={currentIndex === totalQuestions - 1}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>Next Question</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </main>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
                <Flag className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finish Interview Session?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You have submitted answers for <strong className="text-white">{answeredCount}</strong> of <strong className="text-white">{totalQuestions}</strong> questions.
                </p>
              </div>
            </div>

            {answeredCount < totalQuestions && (
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  You have {totalQuestions - answeredCount} unanswered question(s). Unanswered questions will receive 0 points.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                Keep Practicing
              </button>
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 disabled:opacity-50"
              >
                {finishing ? 'Evaluating...' : 'Confirm & View Results'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
