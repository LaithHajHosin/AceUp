/**
 * PrepPressure Main App
 * Implements route handling and authentication boundaries matching Section 10 of the Specification.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { AuthPage } from './features/auth/AuthPage.js';
import { InterviewsPage } from './features/interviews/InterviewsPage.js';
import { InterviewDetailPage } from './features/interviews/InterviewDetailPage.js';
import { InterviewFormPage } from './features/interviews/InterviewFormPage.js';
import { QuestionsPage } from './features/questions/QuestionsPage.js';
import { QuestionDetailPage } from './features/questions/QuestionDetailPage.js';
import { QuestionFormPage } from './features/questions/QuestionFormPage.js';
import { TakeInterviewPage } from './features/attempts/TakeInterviewPage.js';
import { AttemptResultPage } from './features/attempts/AttemptResultPage.js';
import { AttemptsListPage } from './features/attempts/AttemptsListPage.js';
import { ProfilePage } from './features/profile/ProfilePage.js';
import { AdminDashboard } from './features/admin/AdminDashboard.js';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/interviews');

  // Handle browser popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Redirection for root /
  useEffect(() => {
    if (currentPath === '/' || currentPath === '') {
      navigate('/interviews');
    }
  }, [currentPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
        <img src="/logo.png" alt="AceUp Logo" className="w-16 h-16 object-contain animate-pulse" />
        <span>Initializing AceUp Technical Interview Platform...</span>
      </div>
    );
  }

  // Public Auth Pages
  if (!user && (currentPath === '/login' || currentPath === '/register')) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <AuthPage initialMode={currentPath === '/register' ? 'register' : 'login'} navigate={navigate} />
      </div>
    );
  }

  // Route protection: If unauthenticated, redirect to /login
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0b0f19]">
        <AuthPage initialMode="login" navigate={navigate} />
      </div>
    );
  }

  // Match routes
  const renderCurrentView = () => {
    // 1. Interviews
    if (currentPath === '/interviews') {
      return <InterviewsPage navigate={navigate} />;
    }
    if (currentPath === '/interviews/new') {
      return <InterviewFormPage navigate={navigate} />;
    }
    const interviewEditMatch = currentPath.match(/^\/interviews\/(\d+)\/edit$/);
    if (interviewEditMatch) {
      return <InterviewFormPage id={parseInt(interviewEditMatch[1], 10)} navigate={navigate} />;
    }
    const interviewDetailMatch = currentPath.match(/^\/interviews\/(\d+)$/);
    if (interviewDetailMatch) {
      return <InterviewDetailPage id={parseInt(interviewDetailMatch[1], 10)} navigate={navigate} />;
    }

    // 2. Questions
    if (currentPath === '/questions') {
      return <QuestionsPage navigate={navigate} />;
    }
    if (currentPath === '/questions/new') {
      return <QuestionFormPage navigate={navigate} />;
    }
    const questionEditMatch = currentPath.match(/^\/questions\/(\d+)\/edit$/);
    if (questionEditMatch) {
      return <QuestionFormPage id={parseInt(questionEditMatch[1], 10)} navigate={navigate} />;
    }
    const questionDetailMatch = currentPath.match(/^\/questions\/(\d+)$/);
    if (questionDetailMatch) {
      return <QuestionDetailPage id={parseInt(questionDetailMatch[1], 10)} navigate={navigate} />;
    }

    // 3. Attempts
    if (currentPath === '/attempts') {
      return <AttemptsListPage navigate={navigate} />;
    }
    const attemptResultMatch = currentPath.match(/^\/attempts\/(\d+)\/results$/);
    if (attemptResultMatch) {
      return <AttemptResultPage attemptId={parseInt(attemptResultMatch[1], 10)} navigate={navigate} />;
    }
    const attemptRunMatch = currentPath.match(/^\/attempts\/(\d+)$/);
    if (attemptRunMatch) {
      return <TakeInterviewPage attemptId={parseInt(attemptRunMatch[1], 10)} navigate={navigate} />;
    }

    // 4. Profiles
    if (currentPath === '/profile') {
      return <ProfilePage navigate={navigate} />;
    }
    const userProfileMatch = currentPath.match(/^\/users\/(\d+)$/);
    if (userProfileMatch) {
      return <ProfilePage userId={parseInt(userProfileMatch[1], 10)} navigate={navigate} />;
    }

    // 5. Admin Console
    if (currentPath === '/admin') {
      return <AdminDashboard navigate={navigate} />;
    }

    // Default Fallback
    return <InterviewsPage navigate={navigate} />;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-slate-100">
      <Navbar currentRoute={currentPath} navigate={navigate} />
      <main className="flex-1">{renderCurrentView()}</main>
      <footer className="border-t border-slate-900 bg-[#070a11] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AceUp Logo" className="w-7 h-7 object-contain" />
            <p>© 2026 AceUp. Modular technical interview simulation & question mastery platform.</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
              Swagger API Docs (/docs)
            </a>
            <span aria-hidden="true">·</span>
            <button onClick={() => navigate('/questions')} className="hover:text-slate-300">
              Question Bank
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => navigate('/interviews')} className="hover:text-slate-300">
              Interview Tracks
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
