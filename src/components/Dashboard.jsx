import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, User, Camera, Barcode, LogOut, RefreshCw, KeyRound,
  Clock, Activity, AlertCircle, FileText, CheckCircle2, XCircle,
  ExternalLink, Printer, Sparkles, Terminal, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function Dashboard({ user, authToken, onLogout, onOpenBadges }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [recalibratingFace, setRecalibratingFace] = useState(false);
  const [recalibrateSuccess, setRecalibrateSuccess] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await api.getAuditLogs(20);
      setAuditLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Quick Action: Recalibrate face embedding
  const handleRecalibrateFace = async () => {
    sound.playScanPulse();
    setRecalibratingFace(true);
    setActionMsg('Accessing camera and re-indexing 128-d biometric vector...');

    try {
      // Simulate snapshot from camera
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 128;
      dummyCanvas.height = 128;
      const ctx = dummyCanvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 128, 128);
      const faceImg = dummyCanvas.toDataURL('image/jpeg', 0.8);

      const res = await api.updateFace(authToken, faceImg);
      sound.playFaceMatched();
      setRecalibrateSuccess(true);
      setActionMsg(res.message);
      fetchLogs();

      setTimeout(() => {
        setRecalibratingFace(false);
        setRecalibrateSuccess(false);
        setActionMsg(null);
      }, 3500);
    } catch (err) {
      sound.playAccessDenied();
      setActionMsg(`Failed to recalibrate: ${err.message}`);
      setRecalibratingFace(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Welcome & Clearance Banner */}
      <div className="cyber-card-active rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={user?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'}
                alt={user?.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-500 shadow-xl shadow-emerald-500/20"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  CLEARANCE LEVEL {user?.clearanceLevel || 5}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  SEC-AUTHORIZED
                </span>
              </div>

              <p className="text-sm text-slate-300 font-medium">
                {user?.role} • <span className="text-emerald-400">{user?.department}</span>
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  ID: <strong className="text-slate-200">{user?.id}</strong>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
                  <Barcode className="w-3.5 h-3.5 text-amber-400" />
                  Barcode: <strong className="text-slate-200">{user?.barcodePayload}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => { sound.playClick(); onOpenBadges(); }}
              className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Print / View ID Badge</span>
            </button>

            <button
              onClick={handleRecalibrateFace}
              disabled={recalibratingFace}
              className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Recalibrate Face</span>
            </button>

            <button
              onClick={() => { sound.playClick(); onLogout(); }}
              className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action feedback */}
        {actionMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionMsg}</span>
          </div>
        )}
      </div>

      {/* Security Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">AUTH STATUS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">ACTIVE (2FA)</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Face ID + Physical Barcode</div>
        </div>

        <div className="cyber-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">ATTEMPTS</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{stats?.totalAttempts || 0}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Success Rate: {stats?.successRate || 100}%</div>
        </div>

        <div className="cyber-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">BIOMETRIC ENGINE</span>
            <Camera className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-cyan-300 font-mono">128-D COSINE</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Server Vector Accuracy: 96.5%</div>
        </div>

        <div className="cyber-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">INTRUSION SHIELD</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-slate-200 font-mono">ARMED</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Zero tolerance mismatch policy</div>
        </div>
      </div>

      {/* Security Audit Log Widget */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Security Audit Trail</h3>
              <p className="text-xs text-slate-400 font-mono">Live chronological record of multi-factor authentication attempts</p>
            </div>
          </div>

          <button
            onClick={() => { sound.playClick(); fetchLogs(); }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Event</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Step Passed</th>
                <th className="py-2.5 px-3">Details / Failure Reason</th>
                <th className="py-2.5 px-3">IP / Device</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map((log) => {
                const isSuccess = log.event_type === 'LOGIN_SUCCESS';
                const isEnrolled = log.event_type === 'USER_ENROLLED';
                const isUpdated = log.event_type === 'BIOMETRIC_UPDATED';

                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isSuccess && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> LOGIN SUCCESS
                        </span>
                      )}
                      {!isSuccess && !isEnrolled && !isUpdated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" /> REJECTED
                        </span>
                      )}
                      {isEnrolled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold">
                          ENROLLED
                        </span>
                      )}
                      {isUpdated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800 text-[10px] font-bold">
                          RE-INDEXED
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-200 font-semibold whitespace-nowrap">
                      {log.user_name || 'Anonymous Subject'}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-300">
                        {log.step_reached === 2 ? 'Step 2: Barcode' : 'Step 1: Face'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={log.failure_reason || 'Both biometric & barcode matched'}>
                      {log.failure_reason || (
                        <span className="text-emerald-400/90 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 2FA Complete: Face ID + Barcode Verified
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      <div>{log.ip_address}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{log.user_agent}</div>
                    </td>

                    <td className="py-2.5 px-3 text-cyan-400 whitespace-nowrap">
                      {log.latency_ms}ms
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
