import React from 'react';
import { GraduationCap, LogOut, KeyRound, UserPlus, Barcode } from 'lucide-react';

export default function Navbar({ currentView, setView, authenticatedUser, onLogout, onOpenBadges }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#060911]/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* College Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <GraduationCap className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-wider text-slate-100 font-mono">CAMPUS<span className="text-cyan-400">PASS</span></span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Face ID & Biometric Verification
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => { sound.playClick(); setView('auth'); }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'auth'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Student Login</span>
          </button>

          {authenticatedUser && (
            <button
              onClick={() => { sound.playClick(); setView('dashboard'); }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          {currentView === 'admin' && (
            <div className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm font-bold flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Portal</span>
            </div>
          )}

          {/* Partner Websites SSO Direct Links */}
          <div className="hidden lg:flex items-center gap-1 border-l border-r border-slate-800 px-2 mx-1">
            <a href="/attendance" target="_blank" className="px-2.5 py-1 rounded-md text-xs font-mono text-cyan-400 hover:bg-cyan-950/60 border border-cyan-800/60">
              📊 Attendance
            </a>
            <a href="/library" target="_blank" className="px-2.5 py-1 rounded-md text-xs font-mono text-emerald-400 hover:bg-emerald-950/60 border border-emerald-800/60">
              📖 Library
            </a>
            <a href="/leave" target="_blank" className="px-2.5 py-1 rounded-md text-xs font-mono text-amber-400 hover:bg-amber-950/60 border border-amber-800/60">
              📝 Leave
            </a>
          </div>

          {/* Test Badges Quick View */}
          <button
            onClick={() => { if (onOpenBadges) onOpenBadges(); }}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 bg-slate-800/70 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600 cursor-pointer"
            title="View Student ID Badges"
          >
            <Barcode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">ID Badges</span>
          </button>

          {/* Test Badges Quick View */}

          {/* Authenticated User Status or Logout */}
          {authenticatedUser && (
            <div className="flex items-center pl-2 ml-1 border-l border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <img
                  src={authenticatedUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={authenticatedUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/50"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">{authenticatedUser.name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono leading-tight">{authenticatedUser.course}</div>
                </div>
              </div>

              <button
                onClick={() => { sound.playClick(); onLogout(); }}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
