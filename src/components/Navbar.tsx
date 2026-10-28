/**
 * Top Navigation Bar
 * Follows the Top Bar Contract from the Universal Frontend Design Constitution:
 * Exactly 3 zones: [Brand title, one line] — [4-5 clean single-line nav links] — [1-2 primary actions]
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  BrainCircuit,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Code2,
  FileText,
  History,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export function Navbar({ currentRoute, navigate }: NavbarProps) {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title wordmark with AceUp Logo */}
        <button
          onClick={() => navigate('/interviews')}
          className="flex items-center gap-3 text-left focus:outline-none group shrink-0"
        >
          <img
            src="/logo.png"
            alt="AceUp Logo"
            className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white whitespace-nowrap">
                Ace<span className="text-red-500">Up</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/70 border border-red-800/60 text-red-400">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5 hidden sm:block">
              Interview Simulation & Question Bank
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400 shrink-0">
          <button
            onClick={() => navigate('/interviews')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentRoute.startsWith('/interviews') && !currentRoute.includes('/take')
                ? 'text-indigo-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Interviews
          </button>

          <button
            onClick={() => navigate('/questions')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentRoute.startsWith('/questions')
                ? 'text-indigo-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Question Bank
          </button>

          <button
            onClick={() => navigate('/attempts')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              currentRoute === '/attempts'
                ? 'text-indigo-400 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            My Attempts
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                currentRoute === '/admin'
                  ? 'text-amber-400 font-semibold'
                  : 'text-amber-500/90 hover:text-amber-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Role Dashboard
            </button>
          )}

          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60"
            title="Open Swagger API documentation in new tab"
          >
            API /docs
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </nav>

        {/* Zone 3: Account & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 transition-colors focus:outline-none"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold leading-tight text-white whitespace-nowrap">
                    {user.displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {user.role}
                  </div>
                </div>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl shadow-black/50 py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-800 text-xs">
                      <p className="font-semibold text-slate-200">{user.displayName}</p>
                      <p className="text-slate-400 text-[11px] truncate">@{user.username}</p>
                      <div className="mt-1 inline-flex items-center text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                        {user.role} role
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/80 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      View Profile & Stats
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-amber-300 hover:bg-amber-950/30 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        Admin Data Console
                      </button>
                    )}

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors whitespace-nowrap"
              >
                Create Account
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0f172a] px-4 py-3 space-y-2">
          <button
            onClick={() => {
              navigate('/interviews');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Interviews
          </button>
          <button
            onClick={() => {
              navigate('/questions');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
          >
            <Code2 className="w-4 h-4" />
            Question Bank
          </button>
          <button
            onClick={() => {
              navigate('/attempts');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 text-sm text-slate-300 hover:text-white flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            My Attempts
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                navigate('/admin');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 text-sm text-amber-400 hover:text-amber-300 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Role Dashboard
            </button>
          )}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-left py-2 text-sm text-slate-400 flex items-center gap-2"
          >
            API /docs (Swagger)
          </a>
        </div>
      )}
    </header>
  );
}
