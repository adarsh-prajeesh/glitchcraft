import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Terminal, Volume2, VolumeX, LogOut, KeyRound, UserPlus } from 'lucide-react';
import { sound } from '../services/sound';

export default function Navbar({ currentView, setView, authenticatedUser, onLogout, soundMuted, toggleSound, onOpenBadges }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#060911]/90 backdrop-blur-md px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Security Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 cyber-glow-emerald">
              <Shield className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-[#060911]"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-wider text-slate-100 font-mono">AEGIS<span className="text-emerald-400">GUARD</span></span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-medium">
                MFA v4.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              3-FACTOR PROTOCOL ENFORCED
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => { sound.playClick(); setView('auth'); }}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'auth'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>MFA Gate</span>
          </button>

          {authenticatedUser && (
            <button
              onClick={() => { sound.playClick(); setView('dashboard'); }}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Security Dashboard</span>
            </button>
          )}

          <button
            onClick={() => { sound.playClick(); setView('enrollment'); }}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'enrollment'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Enrollment</span>
            <span className="sm:hidden">Enroll</span>
          </button>

          {/* Test Badges Quick Drawer */}
          <button
            onClick={() => { sound.playClick(); onOpenBadges(); }}
            className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 bg-slate-800/70 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600"
            title="View Enrolled ID Badges & Barcodes for Testing"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">ID Badges</span>
          </button>

          {/* Audio Synthesizer Mute Toggle */}
          <button
            onClick={() => { toggleSound(); sound.playClick(); }}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-colors"
            title={soundMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Authenticated User Status or Logout */}
          {authenticatedUser && (
            <div className="flex items-center pl-2 ml-1 border-l border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <img
                  src={authenticatedUser.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'}
                  alt={authenticatedUser.name}
                  className="w-7 h-7 rounded-full object-cover border border-emerald-500/50 ring-1 ring-emerald-500/20"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">{authenticatedUser.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono leading-tight">Clearance L{authenticatedUser.clearanceLevel || 5}</div>
                </div>
              </div>

              <button
                onClick={() => { sound.playClick(); onLogout(); }}
                className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                title="Logout / Terminate Session"
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
