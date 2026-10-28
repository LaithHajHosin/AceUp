/**
 * CountdownTimer Component
 * Contract Section 5: The frontend timer is display-only; the backend decides.
 * Displays high-contrast mm:ss countdown with tabular figures and 60s/30s urgency cues.
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  deadlineAt: string;
  onTimeout?: () => void;
}

export function CountdownTimer({ deadlineAt, onTimeout }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const target = new Date(deadlineAt).getTime();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const target = new Date(deadlineAt).getTime();
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsRemaining(left);

      if (left <= 0) {
        clearInterval(timer);
        onTimeout?.();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [deadlineAt, onTimeout]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = secondsRemaining <= 60;
  const isCritical = secondsRemaining <= 30;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-sm tracking-wider font-semibold tabular-nums transition-colors ${
        isCritical
          ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/30 animate-pulse'
          : isUrgent
          ? 'bg-amber-950/30 text-amber-300 border-amber-500/40'
          : 'bg-slate-900/80 text-slate-200 border-slate-700/80'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-rose-400" />
      ) : (
        <Clock className={`w-4 h-4 ${isUrgent ? 'text-amber-400' : 'text-indigo-400'}`} />
      )}
      <span>{formattedTime}</span>
    </div>
  );
}
