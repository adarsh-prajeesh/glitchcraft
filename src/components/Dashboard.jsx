import React from 'react';
import { LogOut, GraduationCap, Mail, Calendar, BookOpen, Barcode, User, Printer, CheckCircle2 } from 'lucide-react';
import { sound } from '../services/sound';

export default function Dashboard({ user, onLogout }) {
  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in py-6">
      {/* Student Profile Dashboard Card */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Strip */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Student Dashboard</h1>
              <p className="text-xs text-slate-400 font-mono">College Identity & Verified Credentials</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print ID Card</span>
            </button>

            <button
              onClick={() => { sound.playClick(); onLogout(); }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-mono border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Student ID Card Visual Component */}
        <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0c1322] to-[#060911] border border-cyan-500/30 shadow-xl relative z-10">
          {/* ID Card's Photo (Captured in Admin Page) */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={user?.name}
                className="w-36 h-44 rounded-xl object-cover border-2 border-cyan-400/60 shadow-lg"
              />
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[10px] font-bold font-mono shadow-md flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-3 text-center">
              Student Photo ID
            </div>
          </div>

          {/* Student Info Entered in Admin Page */}
          <div className="flex-1 w-full space-y-3.5">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight leading-tight">
                {user?.name}
              </div>
              <div className="text-xs font-mono text-cyan-400 mt-0.5">
                ID: <strong>{user?.id}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
              {/* Course */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] mb-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  Course
                </span>
                <span className="font-semibold text-slate-100">{user?.course}</span>
              </div>

              {/* Age */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] mb-0.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Age
                </span>
                <span className="font-semibold text-slate-100">{user?.age} Years Old</span>
              </div>

              {/* College Email */}
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 sm:col-span-2">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px] mb-0.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  College Institutional Email
                </span>
                <span className="font-semibold text-emerald-400">{user?.email}</span>
              </div>
            </div>

            {/* ID Card Barcode */}
            <div className="p-3 rounded-lg bg-white text-black flex flex-col items-center justify-center text-center">
              {/* Barcode Lines Simulation */}
              <div className="flex items-center justify-center gap-0.5 h-10 w-full px-4">
                {Array.from({ length: 44 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-black"
                    style={{
                      width: (i % 3 === 0 || i % 7 === 0) ? '3px' : (i % 2 === 0) ? '2px' : '1px',
                      marginRight: (i % 5 === 0) ? '2.5px' : '0.5px'
                    }}
                  />
                ))}
              </div>
              <div className="font-mono font-bold text-xs mt-1 tracking-widest text-slate-900">
                {user?.barcodePayload}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
