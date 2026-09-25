import React, { useState, useEffect, useRef } from 'react';
import { Radio, CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Cpu, Usb, ArrowLeft, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function RfidScanStep({ step1Data, onSuccess, onBack }) {
  const [rfidInput, setRfidInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [verifiedRfid, setVerifiedRfid] = useState(null);
  const [isListening, setIsListening] = useState(true);
  const [usbStatus, setUsbStatus] = useState(null);

  const inputRef = useRef(null);
  const keyBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const targetUser = step1Data?.matchedUser;

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Global Keyboard Wedge Listener:
  // Physical USB RFID readers behave as keyboards typing rapid keystrokes (<50ms apart) ending with 'Enter'.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in a different text input
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) {
        return;
      }

      const now = Date.now();
      const char = e.key;

      if (char === 'Enter') {
        if (keyBufferRef.current.length >= 4) {
          const scannedCode = keyBufferRef.current.trim();
          keyBufferRef.current = '';
          setRfidInput(scannedCode);
          handleVerifyRfid(scannedCode);
        }
      } else if (char.length === 1) {
        // If keystroke arrived within 100ms of last, likely a hardware reader
        if (now - lastKeyTimeRef.current > 350) {
          keyBufferRef.current = char;
        } else {
          keyBufferRef.current += char;
        }
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step1Data]);

  // Submit and verify RFID against backend
  const handleVerifyRfid = async (uidToVerify = null) => {
    const cardUid = (uidToVerify || rfidInput).trim();
    if (!cardUid) {
      setErrorMsg('Please tap an RFID card or enter the card identifier.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    sound.playRfidTap();

    try {
      const response = await api.verifyStep2Rfid({
        step1Token: step1Data.step1Token,
        rfidUid: cardUid
      });

      setVerifiedRfid(response.verifiedRfid);
      sound.playFaceMatched();

      setTimeout(() => {
        onSuccess({
          step2Token: response.step2Token,
          verifiedRfid: response.verifiedRfid,
          matchedUser: targetUser
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      sound.playAccessDenied();
      setErrorMsg(err.message || 'RFID card verification failed');
      setVerifiedRfid(null);
    } finally {
      setLoading(false);
    }
  };

  // Optional WebUSB Hardware Reader Connect
  const handleConnectWebUsb = async () => {
    if (!navigator.usb) {
      setUsbStatus('WebUSB is not supported in this browser version. Use Keyboard Wedge mode.');
      return;
    }
    try {
      setUsbStatus('Requesting USB device pairing...');
      const device = await navigator.usb.requestDevice({ filters: [] });
      setUsbStatus(`Connected to: ${device.productName || 'USB RFID Reader'}`);
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(0);
    } catch (e) {
      console.warn('WebUSB pair cancelled or failed:', e);
      setUsbStatus('USB pair cancelled. Automatic Keyboard Wedge listener is still active.');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto cyber-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      {/* Subject verified banner */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <img
            src={targetUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80'}
            alt={targetUser?.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/50"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{targetUser?.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Face Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ID: {targetUser?.id} • Clearance L{targetUser?.clearanceLevel} • {targetUser?.department}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Change User</span>
        </button>
      </div>

      {/* Main RFID Contactless Card Scanner Viewport */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#060c18] to-[#040810] border border-cyan-500/30 p-8 flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Animated Radio Wave Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border border-cyan-500/20 animate-rfid-pulse"></div>
          <div className="w-64 h-64 rounded-full border border-cyan-500/15 animate-rfid-pulse" style={{ animationDelay: '0.8s' }}></div>
          <div className="w-80 h-80 rounded-full border border-cyan-500/10 animate-rfid-pulse" style={{ animationDelay: '1.6s' }}></div>
        </div>

        {/* Central Card Reader Graphic */}
        <div className="relative z-10 my-4">
          <div className="w-24 h-24 rounded-2xl bg-cyan-950/60 border-2 border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-xl shadow-cyan-500/20 group">
            <Radio className="w-12 h-12 text-cyan-400 animate-pulse" />
          </div>

          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-slate-900 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-100 relative z-10 mt-2">
          Step 2: Tap Physical RFID Smart Card
        </h3>
        <p className="text-xs text-slate-400 font-mono max-w-sm mt-1 mb-4 relative z-10">
          Hold physical ID card against NFC / 13.56 MHz contactless reader terminal.
        </p>

        {/* Live Reader Status Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-xs font-mono text-cyan-300 relative z-10">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>READER LISTENING (KEYBOARD-WEDGE & USB ACTIVE)</span>
        </div>

        {/* Success Overlay */}
        {verifiedRfid && (
          <div className="absolute inset-0 z-30 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              RFID HANDSHAKE VERIFIED
            </span>
            <div className="text-lg font-mono font-bold text-white mt-1">
              UID: {verifiedRfid}
            </div>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              Physical Card matched to {targetUser?.name}
            </p>
            <p className="text-[11px] text-slate-300 mt-2 animate-pulse font-mono">
              Proceeding to Step 3: Barcode Optics Verification...
            </p>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">RFID Authentication Rejected</div>
            <p className="mt-0.5 text-rose-300/90 font-mono text-[11px]">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setErrorMsg(null); setRfidInput(''); }}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-mono transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Manual / Hardware Wedge Input Field */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleVerifyRfid(); }}
        className="mt-5 flex gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan or type RFID UID (e.g. E2-84-72-91)"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value)}
            disabled={loading || !!verifiedRfid}
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-600"
          />
          <CreditCard className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={loading || !!verifiedRfid || !rfidInput}
          className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all border border-cyan-400/40 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify</span>}
        </button>
      </form>

      {/* Interactive Virtual RFID Card Simulator for Testing */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Virtual RFID Card Simulator (Hardware Bypass)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Click to Tap</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Target user's authentic card */}
          <button
            onClick={() => {
              const uid = targetUser?.id === 'SEC-8801' ? 'E2-84-72-91' : targetUser?.id === 'SEC-8802' ? 'C8-47-E3-11' : '7B-12-89-6D';
              setRfidInput(uid);
              handleVerifyRfid(uid);
            }}
            disabled={loading || !!verifiedRfid}
            className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">AUTHENTIC BADGE</span>
              <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1 truncate">
              {targetUser?.name}'s Card
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              UID: {targetUser?.id === 'SEC-8801' ? 'E2-84-72-91' : targetUser?.id === 'SEC-8802' ? 'C8-47-E3-11' : '7B-12-89-6D'}
            </div>
          </button>

          {/* Mismatched Card (Someone else's card) */}
          <button
            onClick={() => {
              const fakeUid = '99-AA-BB-CC';
              setRfidInput(fakeUid);
              handleVerifyRfid(fakeUid);
            }}
            disabled={loading || !!verifiedRfid}
            className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-amber-400 font-semibold">MISMATCH TEST</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1 truncate">
              Unregistered Card
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              UID: 99-AA-BB-CC
            </div>
          </button>

          {/* Revoked Card Test */}
          <button
            onClick={() => {
              const revokedUid = 'REVOKED-TAG-99';
              setRfidInput(revokedUid);
              handleVerifyRfid(revokedUid);
            }}
            disabled={loading || !!verifiedRfid}
            className="p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-rose-400 font-semibold">THEFT SIMULATION</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xs font-bold text-slate-200 mt-1 truncate">
              Stolen/Revoked Badge
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Triggers Lockout Alert
            </div>
          </button>
        </div>

        {/* Optional WebUSB Connect prompt */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Physical USB Reader Mode: Plug & Scan directly</span>
          <button
            onClick={handleConnectWebUsb}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <Usb className="w-3 h-3" />
            <span>Connect WebUSB</span>
          </button>
        </div>
        {usbStatus && <p className="text-[10px] text-cyan-400/80 font-mono mt-1">{usbStatus}</p>}
      </div>
    </div>
  );
}
