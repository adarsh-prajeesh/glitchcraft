import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraOff, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, User, Crosshair, Server, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function FaceScanStep({ onSuccess, demoUsers = [], onGoToEnrollment }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('Engine Ready');

  // Start webcam stream
  const startCamera = async () => {
    setErrorMsg(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        startHudLoop();
      }
    } catch (err) {
      console.warn('Webcam access error:', err);
      setCameraError('Camera access unavailable or permission not granted.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Biometric HUD Canvas Overlay Animation
  const startHudLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    const render = () => {
      if (!canvas) return;
      const w = canvas.width = 640;
      const h = canvas.height = 480;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 - 10;
      const rx = 120;
      const ry = 150;

      // Biometric Oval Reticle
      ctx.save();
      ctx.strokeStyle = matchResult ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Corner target brackets
      const bSize = 30;
      ctx.setLineDash([]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = matchResult ? '#10b981' : '#10b981';

      // Top-Left bracket
      ctx.beginPath();
      ctx.moveTo(cx - rx - 20, cy - ry + bSize);
      ctx.lineTo(cx - rx - 20, cy - ry - 10);
      ctx.lineTo(cx - rx - 20 + bSize, cy - ry - 10);
      ctx.stroke();

      // Top-Right bracket
      ctx.beginPath();
      ctx.moveTo(cx + rx + 20 - bSize, cy - ry - 10);
      ctx.lineTo(cx + rx + 20, cy - ry - 10);
      ctx.lineTo(cx + rx + 20, cy - ry - 10);
      ctx.lineTo(cx + rx + 20, cy - ry + bSize);
      ctx.stroke();

      // Bottom-Left bracket
      ctx.beginPath();
      ctx.moveTo(cx - rx - 20, cy + ry - bSize);
      ctx.lineTo(cx - rx - 20, cy + ry + 10);
      ctx.lineTo(cx - rx - 20 + bSize, cy + ry + 10);
      ctx.stroke();

      // Bottom-Right bracket
      ctx.beginPath();
      ctx.moveTo(cx + rx + 20 - bSize, cy + ry + 10);
      ctx.lineTo(cx + rx + 20, cy + ry + 10);
      ctx.lineTo(cx + rx + 20, cy + ry - bSize);
      ctx.stroke();

      // Rotating Radar Scan Line
      angle += 0.04;
      const radGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
      radGrad.addColorStop(0, 'rgba(16, 185, 129, 0.03)');
      radGrad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Facial mesh landmark tracking simulation points
      const landmarks = [
        { x: cx - 40, y: cy - 35 },
        { x: cx + 40, y: cy - 35 },
        { x: cx, y: cy + 5 },
        { x: cx - 30, y: cy + 55 },
        { x: cx + 30, y: cy + 55 },
        { x: cx, y: cy + 90 }
      ];

      landmarks.forEach((pt) => {
        ctx.fillStyle = matchResult ? '#10b981' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(pt.x + (Math.sin(angle * 2) * 1.5), pt.y + (Math.cos(angle * 2) * 1.5), 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // HUD text overlay
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = matchResult ? '#10b981' : '#38bdf8';
      ctx.fillText(`CAPTURE: LIVE WEBCAM // TRANSMIT TO SERVER`, 24, 30);
      ctx.fillText(`SERVER ENGINE: 128-D COSINE SIMILARITY`, 24, 46);
      ctx.fillText(matchResult ? `STATUS: BIOMETRIC MATCH CONFIRMED` : `STATUS: ALIGNING FACIAL MESH...`, 24, 62);

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
  };

  // Capture current camera video frame as base64 JPEG image
  const captureFrameAsBase64 = () => {
    if (!videoRef.current || !cameraActive) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Send camera frame to server for facial biometric analysis
  const handlePerformScan = async (selectedTargetUserId = null) => {
    setErrorMsg(null);
    setLoading(true);
    setScanning(true);
    setScanProgress(20);
    setServerStatus('Capturing camera frame...');
    sound.playScanPulse();

    try {
      await new Promise(r => setTimeout(r, 250));
      setScanProgress(50);
      setServerStatus('Transmitting face image to backend server...');
      sound.playScanPulse();

      const faceImageBase64 = captureFrameAsBase64();

      await new Promise(r => setTimeout(r, 250));
      setScanProgress(80);
      setServerStatus('Server calculating vector cosine distance...');

      const payload = selectedTargetUserId
        ? { targetUserId: selectedTargetUserId }
        : { faceImage: faceImageBase64 };

      // Call server-side verification endpoint
      const response = await api.verifyStep1Face(payload);

      setScanProgress(100);
      setServerStatus('Biometric match confirmed on server');
      setMatchResult(response);
      sound.playFaceMatched();

      // Advance to Step 2: Barcode scan
      setTimeout(() => {
        onSuccess({
          step1Token: response.step1Token,
          matchedUser: response.matchedUser,
          confidence: response.confidencePercent || 96
        });
      }, 1200);

    } catch (err) {
      console.error(err);
      sound.playAccessDenied();
      setErrorMsg(err.message || 'Server facial recognition could not match any authorized personnel');
      setMatchResult(null);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto cyber-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      {/* Decorative cyber grid backdrop */}
      <div className="absolute inset-0 biometric-grid opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Crosshair className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Step 1: Face ID Verification
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Camera sends facial snapshot to server-side biometric vector engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
            <Server className="w-3 h-3" />
            <span>SERVER VERIFIED</span>
          </span>

          {cameraActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              CAMERA LIVE
            </span>
          )}
        </div>
      </div>

      {/* Camera / Viewport Container */}
      <div className="relative rounded-xl overflow-hidden bg-[#03060c] border border-slate-800/80 aspect-video flex items-center justify-center shadow-inner">
        {/* Real Live Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            cameraActive ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Canvas HUD overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
        />

        {/* Camera Standby Fallback */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/90">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Camera Feed Standby</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 font-mono">
              {cameraError || 'Please allow webcam permission to capture and send your face to the server.'}
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Retry Camera Connect</span>
            </button>
          </div>
        )}

        {/* Scanning & Server Progress Overlay */}
        {scanning && (
          <div className="absolute bottom-4 left-4 right-4 z-30 bg-slate-950/90 backdrop-blur-md p-3 rounded-lg border border-cyan-500/50">
            <div className="flex justify-between items-center text-xs font-mono text-cyan-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                {serverStatus}
              </span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Confirmation Overlay */}
        {matchResult && (
          <div className="absolute inset-0 z-40 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 cyber-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              SERVER-SIDE IDENTITY MATCHED
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              {matchResult.matchedUser.name}
            </h3>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              {matchResult.matchedUser.department} • Clearance Level {matchResult.matchedUser.clearanceLevel}
            </p>
            <div className="mt-3 px-3 py-1 rounded bg-emerald-900/60 border border-emerald-500/40 text-xs font-mono text-emerald-200">
              Vector Confidence: {matchResult.confidencePercent}% (Threshold: 75%)
            </div>
            <p className="text-[11px] text-slate-300 mt-2 animate-pulse font-mono">
              Advancing to Step 2: Camera Barcode Scan...
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Biometric Verification Failed</div>
            <p className="mt-0.5 text-rose-300/90 font-mono text-[11px]">{errorMsg}</p>
          </div>
          <button
            onClick={() => handlePerformScan()}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-mono transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Trigger & Enrolled Directory */}
      <div className="mt-5 space-y-4">
        <button
          onClick={() => handlePerformScan()}
          disabled={loading || !!matchResult}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 border border-emerald-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Facial Biometrics on Server...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Capture Face & Verify on Server</span>
            </>
          )}
        </button>

        {/* Dynamic Enrolled Personnel List */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3 text-cyan-400" />
              Enrolled Personnel Directory ({demoUsers.length})
            </span>
            {demoUsers.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">Select to verify</span>
            )}
          </div>

          {demoUsers.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 font-mono">
                No personnel enrolled in the biometric database yet.
              </p>
              <button
                onClick={onGoToEnrollment}
                className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium hover:bg-cyan-600/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Go to Admin Enrollment to Register Face & Barcode</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handlePerformScan(user.id)}
                  disabled={loading || !!matchResult}
                  className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={user.avatar_url || user.avatarUrl}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 group-hover:border-emerald-500/60"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        L{user.clearance_level || user.clearanceLevel} • {user.department || user.role}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
