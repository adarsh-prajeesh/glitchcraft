import React from 'react';
import { Video, KeyRound, CheckCircle2 } from 'lucide-react';

export default function StepWizard({ currentStep, step1Data, step2Data }) {
  const steps = [
    {
      num: 1,
      title: 'Face & Video Liveness Challenge',
      subtitle: 'Randomized Action Verification',
      icon: Video,
      passed: !!step1Data
    },
    {
      num: 2,
      title: 'Digital Identity Wallet',
      subtitle: 'Cryptographic Proof & Claims',
      icon: KeyRound,
      passed: !!step2Data
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 px-2">
      <div className="grid grid-cols-2 gap-3 sm:gap-6 relative">
        <div className="absolute top-1/2 left-16 right-16 -translate-y-1/2 h-0.5 bg-slate-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{
              width: currentStep === 1 ? '30%' : '100%'
            }}
          />
        </div>

        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.num;
          const isPassed = step.passed;

          return (
            <div
              key={step.num}
              className={`relative z-10 flex flex-col items-center p-3.5 sm:p-4 rounded-xl border transition-all duration-300 ${
                isPassed
                  ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : isActive
                  ? 'bg-slate-900/95 border-cyan-500/70 shadow-lg shadow-cyan-500/20 scale-[1.02] ring-1 ring-cyan-500/40'
                  : 'bg-slate-950/70 border-slate-800/80 opacity-60'
              }`}
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                  isPassed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 animate-pulse'
                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/50'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>

              <div className="text-center mt-2.5">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Step 0{step.num}</span>
                  {isPassed && <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 rounded">VERIFIED</span>}
                  {isActive && <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-1 rounded animate-pulse">ACTIVE</span>}
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5 truncate">{step.title}</div>
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono hidden sm:block">{step.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
