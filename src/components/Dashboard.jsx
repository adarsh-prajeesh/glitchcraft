import React, { useState, useEffect } from 'react';
import { LogOut, GraduationCap, Mail, Calendar, BookOpen, ShieldCheck, ShieldAlert, Key, Plus, ExternalLink, CheckCircle2, Lock, Unlock, Copy } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function Dashboard({ user, onLogout }) {
  const [claims, setClaims] = useState([]);
  const [trustedSites, setTrustedSites] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);

  // New Claim Form State
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('basic');
  const [claimMsg, setClaimMsg] = useState(null);

  // Proof Generator State
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [targetDomain, setTargetDomain] = useState('library.university.edu');
  const [generatedProof, setGeneratedProof] = useState(null);
  const [generatingProof, setGeneratingProof] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [user]);

  const loadWalletData = async () => {
    try {
      setLoadingClaims(true);
      const userClaims = await api.getClaims(user?.id);
      setClaims(userClaims);

      const sites = await api.getTrustedSites();
      setTrustedSites(sites);
    } catch (e) {
      console.error('Failed to load wallet claims:', e);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleAddClaim = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      sound.playClick();
      await api.addClaim({
        userId: user?.id,
        claimKey: newKey.trim(),
        claimValue: newValue.trim(),
        category: newCategory
      });

      sound.playAccessGranted();
      setClaimMsg(`Claim '${newKey}' added to identity wallet successfully!`);
      setNewKey('');
      setNewValue('');
      setNewCategory('basic');
      loadWalletData();
    } catch (e) {
      sound.playAccessDenied();
      setClaimMsg(`Error: ${e.message}`);
    }
  };

  const handleGenerateProof = async () => {
    if (selectedClaims.length === 0) return;
    try {
      sound.playClick();
      setGeneratingProof(true);
      const res = await api.generateProof({
        targetDomain,
        claimsToProve: selectedClaims,
        userId: user?.id
      });
      sound.playAccessGranted();
      setGeneratedProof(res.proof);
    } catch (e) {
      sound.playAccessDenied();
    } finally {
      setGeneratingProof(false);
    }
  };

  const toggleClaimSelect = (claimKey) => {
    if (selectedClaims.includes(claimKey)) {
      setSelectedClaims(selectedClaims.filter(c => c !== claimKey));
    } else {
      setSelectedClaims([...selectedClaims, claimKey]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in py-6">
      {/* Wallet Profile Header Card */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Digital Identity Wallet</h1>
              <p className="text-xs text-slate-400 font-mono">Verify Once • Reuse Securely • Prove, Don't Expose</p>
            </div>
          </div>

          <button
            onClick={() => { sound.playClick(); onLogout(); }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-mono border border-rose-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Wallet</span>
          </button>
        </div>

        {/* User Card Visual */}
        <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0c1322] to-[#060911] border border-cyan-500/30 shadow-xl">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
            alt={user?.name}
            className="w-28 h-32 rounded-xl object-cover border-2 border-cyan-400/60 shadow-lg"
          />
          <div className="flex-1 space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">{user?.name}</h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            </div>
            <p className="text-xs font-mono text-cyan-400">ID: {user?.id} • {user?.email}</p>
            <p className="text-xs font-mono text-slate-300">{user?.course} • {user?.age} Years Old</p>
          </div>
        </div>
      </div>

      {/* Section 1: Wallet Claims Directory (Basic vs Protected) */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Stored Identity Credentials / Claims</h3>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            {claims.length} Claims Verified
          </span>
        </div>

        {loadingClaims ? (
          <div className="p-6 text-center text-xs font-mono text-slate-500">Loading wallet claims...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {claims.map((c, i) => (
              <div
                key={i}
                onClick={() => toggleClaimSelect(c.claim_key)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedClaims.includes(c.claim_key)
                    ? 'bg-cyan-950/50 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-slate-200">{c.claim_key}</span>
                  {c.category === 'protected' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Protected
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                      <Unlock className="w-3 h-3 text-emerald-400" /> Basic
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-cyan-300 font-semibold truncate">{c.claim_value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Form: Add Custom Credential / Claim */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-cyan-400" /> Add New Credential Claim to Wallet
          </h4>

          {claimMsg && (
            <div className="mb-3 text-xs font-mono text-emerald-300 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40">
              {claimMsg}
            </div>
          )}

          <form onSubmit={handleAddClaim} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              placeholder="Claim Title (e.g. Passport No)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <input
              type="text"
              required
              placeholder="Claim Value (e.g. Z9988771)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              <option value="basic">Basic Information</option>
              <option value="protected">Protected (Requires Liveness)</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md"
            >
              + Add Claim
            </button>
          </form>
        </div>
      </div>

      {/* Section 2: Cryptographic Proof Generator ("Prove, Don't Expose") */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Cryptographic Proof Generator</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            HMAC Domain-Bound Proof
          </span>
        </div>

        <p className="text-xs text-slate-400 font-mono mb-4">
          Select claims above to generate a domain-bound zero-exposure proof for trusted websites.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase">Target Website Domain</label>
            <input
              type="text"
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleGenerateProof}
            disabled={selectedClaims.length === 0 || generatingProof}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 mt-auto"
          >
            {generatingProof ? 'Generating Proof...' : `Generate Proof for ${selectedClaims.length} Claim(s)`}
          </button>
        </div>

        {generatedProof && (
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs font-mono space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
              <span>✓ Cryptographic Proof Generated</span>
              <span>{generatedProof.proofId}</span>
            </div>
            <pre className="text-[11px] text-slate-300 overflow-x-auto p-2.5 bg-slate-900 rounded-lg">
              {JSON.stringify(generatedProof, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Section 3: Registered Trusted Websites */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Registered Trusted Verifiers</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Total: {trustedSites.length}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          {trustedSites.map((s) => (
            <div key={s.domain} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">{s.name}</div>
                <div className="text-[10px] text-cyan-400">{s.domain}</div>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                TRUSTED
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
