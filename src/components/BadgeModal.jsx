import React, { useState } from 'react';
import { X, Printer, Shield, Barcode, CheckCircle2, Copy } from 'lucide-react';
import { sound } from '../services/sound';

export default function BadgeModal({ isOpen, onClose, users = [] }) {
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showBack, setShowBack] = useState(false);

  if (!isOpen || users.length === 0) return null;

  const user = users[selectedUserIndex] || users[0];

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(user.barcode_payload || user.barcodePayload);
    setCopied(true);
    sound.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl cyber-card rounded-2xl p-6 border border-slate-700 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 font-mono">
              Official Physical Defense ID Badge
            </h3>
          </div>

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge Switcher Tabs */}
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
          {users.map((u, idx) => (
            <button
              key={u.id}
              onClick={() => { sound.playClick(); setSelectedUserIndex(idx); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                idx === selectedUserIndex
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {u.name.split(' ')[0]} ({u.id})
            </button>
          ))}
        </div>

        {/* Physical ID Card Viewport */}
        <div className="flex flex-col items-center">
          {/* Card Toggle Button: Front vs Back */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowBack(false)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                !showBack ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Card Front (Photo & Clearance)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setShowBack(true)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                showBack ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Card Back (Scannable Barcode)
            </button>
          </div>

          {/* Realistic High-Res ID Card Object */}
          <div className="w-full max-w-sm aspect-[1.586] rounded-2xl bg-gradient-to-br from-slate-900 via-[#0a1120] to-[#040810] p-5 border-2 border-slate-700 shadow-2xl relative overflow-hidden text-slate-100 flex flex-col justify-between">
            {/* Holographic Watermark Band */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 via-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none" />

            {!showBack ? (
              /* CARD FRONT */
              <>
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
                      A
                    </div>
                    <div>
                      <div className="text-[10px] font-mono tracking-widest uppercase text-slate-400 leading-none">AEGIS DEFENSE</div>
                      <div className="text-[11px] font-bold text-white tracking-wider leading-tight">DEPARTMENT OF SECURITY</div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-bold">
                    L{user.clearance_level || user.clearanceLevel || 5}
                  </span>
                </div>

                <div className="flex items-center gap-4 my-2 relative z-10">
                  <img
                    src={user.avatar_url || user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'}
                    alt={user.name}
                    className="w-20 h-24 rounded-lg object-cover border border-slate-600 shadow-md"
                  />

                  <div className="overflow-hidden">
                    <div className="text-sm font-bold text-white leading-tight">{user.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{user.role}</div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{user.department}</div>

                    <div className="mt-2 text-[9px] font-mono text-slate-400 flex items-center gap-2">
                      <span>ID: <strong className="text-slate-200">{user.id}</strong></span>
                      <span className="text-emerald-400 font-bold">BIOMETRIC: PASS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[8px] font-mono text-slate-500 relative z-10">
                  <span>EXP: 2028-12-31</span>
                  <span>PROPERTY OF DEFENSE COMMAND</span>
                </div>
              </>
            ) : (
              /* CARD BACK (SCANNABLE BARCODE) */
              <>
                <div className="w-full h-8 bg-black -mx-5 -mt-5 mb-2 flex items-center px-4">
                  <span className="text-[8px] font-mono text-slate-500">MAGNETIC STRIPE TRACK 1 & 2 ENCRYPTED</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-2 text-center">
                  <div className="text-[9px] text-slate-400 font-mono mb-1">
                    OFFICIAL BARCODE PAYLOAD
                  </div>

                  {/* Scannable Barcode Graphic */}
                  <div className="bg-white p-3 rounded-lg border border-slate-300 w-full flex flex-col items-center justify-center">
                    {/* Simulated High-Res Code 128 Bar Pattern */}
                    <div className="flex items-center justify-center gap-0.5 h-12 w-full px-2">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{
                            width: (i % 3 === 0 || i % 7 === 0) ? '3px' : (i % 2 === 0) ? '2px' : '1px',
                            marginRight: (i % 5 === 0) ? '2px' : '0.5px'
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-black font-mono font-bold text-xs mt-1 tracking-widest">
                      {user.barcode_payload || user.barcodePayload}
                    </div>
                  </div>

                  <p className="text-[8px] text-slate-400 mt-2 font-mono leading-tight">
                    Present this barcode to the optical terminal camera to authenticate.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs font-mono text-slate-400">
            Barcode Payload: <strong className="text-cyan-300">{user.barcode_payload || user.barcodePayload}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBarcode}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
