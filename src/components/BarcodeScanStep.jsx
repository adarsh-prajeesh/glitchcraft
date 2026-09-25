import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Camera, RefreshCw, CheckCircle2, AlertTriangle, ArrowLeft, ShieldCheck, Sparkles, Scan, KeyRound } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function BarcodeScanStep({ step1Data, onSuccess, onBack, onOpenBadges }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);

  const scannerRef = useRef(null);
  const inputRef = useRef(null);
  const keyBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  const targetUser = step1Data?.matchedUser;

  // Start HTML5 Camera Barcode Scanner
  const startCameraBarcodeScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode("barcode-scanner-viewport");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 320, height: 160 },
        aspectRatio: 1.777778
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Barcode successfully decoded from camera stream!
          sound.playBarcodeChirp();
          setBarcodeInput(decodedText);
          handleVerifyBarcode(decodedText);
        },
        (errorMessage) => {
          // Frame tick
        }
      );

      setCameraActive(true);
    } catch (err) {
      console.warn("Camera barcode scanner init error:", err);
      setCameraActive(false);
    }
  };

  const stopCameraBarcodeScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCameraBarcodeScanner();
    return () => {
      stopCameraBarcodeScanner();
    };
  }, []);

  // Hardware Laser Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) {
        return;
      }

      const now = Date.now();
      const char = e.key;

      if (char === 'Enter') {
        if (keyBufferRef.current.length >= 3) {
          const code = keyBufferRef.current.trim();
          keyBufferRef.current = '';
          setBarcodeInput(code);
          handleVerifyBarcode(code);
        }
      } else if (char.length === 1) {
        if (now - lastKeyTimeRef.current > 250) {
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

  // Submit & Verify Barcode against Backend
  const handleVerifyBarcode = async (payloadToVerify = null) => {
    const payload = (payloadToVerify || barcodeInput).trim();
    if (!payload) {
      setErrorMsg('Please scan or enter the ID card barcode payload.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await api.verifyStep2Barcode({
        step1Token: step1Data.step1Token,
        barcodePayload: payload
      });

      setScannedResult(payload);
      sound.playAccessGranted();

      stopCameraBarcodeScanner();

      // Transition to Secured Dashboard with Auth Token
      setTimeout(() => {
        onSuccess({
          authToken: response.authToken,
          user: response.user
        });
      }, 1200);

    } catch (err) {
      console.error(err);
      sound.playAccessDenied();
      setErrorMsg(err.message || 'ID Card barcode payload mismatch');
      setScannedResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto cyber-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      {/* Subject Identity Banner */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
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
                Face ID Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              ID: {targetUser?.id} • {targetUser?.course} • Age: {targetUser?.age}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Face ID</span>
        </button>
      </div>

      {/* Main Barcode Camera Viewport */}
      <div className="relative rounded-2xl bg-[#03060c] border border-cyan-500/30 overflow-hidden shadow-inner aspect-video flex items-center justify-center">
        {/* HTML5 QR/Barcode Scanner Target Element */}
        <div id="barcode-scanner-viewport" className="w-full h-full object-cover" />

        {/* Optical Scanning Crosshairs Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          {/* Laser Scanning Line */}
          <div className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-laser" />

          {/* Barcode Framing Box */}
          <div className="w-72 h-36 border-2 border-cyan-400/60 rounded-lg relative">
            <span className="absolute -top-3 left-3 bg-[#060911] px-2 text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              ALIGN ID BARCODE HERE
            </span>

            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300"></div>
          </div>
        </div>

        {/* Camera fallback if permission blocked */}
        {!cameraActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95">
            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
              <Camera className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Camera Barcode Scanner Standby</h4>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-3 max-w-sm">
              Point your camera at the physical ID card barcode, or enter the payload below.
            </p>
            <button
              onClick={startCameraBarcodeScanner}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera Scanner</span>
            </button>
          </div>
        )}

        {/* Access Granted Victory Screen */}
        {scannedResult && (
          <div className="absolute inset-0 z-40 bg-emerald-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-2.5 cyber-glow-emerald">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              MULTI-FACTOR AUTHENTICATION GRANTED
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              Welcome, {targetUser?.name}
            </h3>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              Face ID & ID Barcode matched • {targetUser?.course}
            </p>
            <div className="mt-3 px-3 py-1 rounded bg-emerald-900/60 border border-emerald-500/40 text-xs font-mono text-emerald-200">
              Payload: {scannedResult}
            </div>
            <p className="text-[11px] text-slate-300 mt-2.5 animate-pulse font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session Authenticated. Opening Dashboard...</span>
            </p>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Authentication Rejected</div>
            <p className="mt-0.5 text-rose-300/90 font-mono text-[11px]">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setErrorMsg(null); setBarcodeInput(''); }}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-mono transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Manual / Scanner Wedge Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleVerifyBarcode(); }}
        className="mt-5 flex gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan or enter ID Card Barcode payload"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            disabled={loading || !!scannedResult}
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-600"
          />
          <Barcode className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={loading || !!scannedResult || !barcodeInput}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-semibold transition-all border border-cyan-400/40 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Verify Barcode</span>}
        </button>
      </form>

      {/* Quick Verified Subject Card Trigger */}
      {targetUser?.barcodePayload && (
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Registered Card for {targetUser.name}:
          </span>
          <button
            onClick={() => {
              setBarcodeInput(targetUser.barcodePayload);
              handleVerifyBarcode(targetUser.barcodePayload);
            }}
            disabled={loading || !!scannedResult}
            className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 cursor-pointer"
          >
            Auto-Fill & Scan ({targetUser.barcodePayload})
          </button>
        </div>
      )}
    </div>
  );
}
