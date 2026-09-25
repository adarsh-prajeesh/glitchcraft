import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, ShieldAlert, Sparkles, User, Lock, Video, Hand, ArrowRightLeft, Eye } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

const CHALLENGES = [
  { id: 'raise_hand', text: 'Raise your right hand to the camera', icon: Hand, hint: 'Hold hand up next to your face' },
  { id: 'turn_left', text: 'Turn your head slightly to the LEFT', icon: ArrowRightLeft, hint: 'Rotate head 30° left' },
  { id: 'blink_eyes', text: 'Blink your eyes twice slowly', icon: Eye, hint: 'Blink clearly in front of camera' },
  { id: 'tilt_right', text: 'Tilt your head to the RIGHT', icon: ArrowRightLeft, hint: 'Tilt head sideways' }
];

export default function FaceScanStep({ onSuccess, demoUsers }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentChallenge, setCurrentChallenge] = useState(CHALLENGES[0]);
  const [challengeStep, setChallengeStep] = useState('face_match'); // 'face_match' | 'action_challenge' | 'verifying'
  const [livenessPassed, setLivenessPassed] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  const [serverStatus, setServerStatus] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Progressive Lockout timer countdown
  useEffect(() => {
    let timer;
    if (lockedUntil) {
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
        setLockCountdown(remaining);
        if (remaining <= 0) {
          setLockedUntil(null);
          setFailedAttempts(0);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockedUntil]);

  // Select a random action challenge
  const pickRandomChallenge = () => {
    const idx = Math.floor(Math.random() * CHALLENGES.length);
    setCurrentChallenge(CHALLENGES[idx]);
  };

  useEffect(() => {
    pickRandomChallenge();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [cameraActive]);

  // Start Webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraLoading(true);

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Webcam not supported or requires a secure origin (HTTPS/localhost).');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (e) {
      console.warn('Camera access error:', e);
      setCameraError(e.message || 'Camera access unavailable.');
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  // Perform Face Match + Liveness Action Verification
  const handlePerformScan = async (targetUserId = null) => {
    if (lockedUntil && Date.now() < lockedUntil) return;

    if (!cameraActive && !targetUserId) {
      await startCamera();
      // Allow camera stream to settle
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      sound.playScanPulse();
    } catch (e) {}
    setScanning(true);
    setScanProgress(15);
    setServerStatus('Extracting 128-d Biometric Face Features...');
    setErrorMsg(null);
    setMatchResult(null);

    let frameB64 = null;
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const cvs = document.createElement('canvas');
      cvs.width = 320;
      cvs.height = 240;
      const ctx = cvs.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      frameB64 = cvs.toDataURL('image/jpeg', 0.85);
    }

    setTimeout(() => {
      setScanProgress(55);
      setServerStatus(`Verifying Action Challenge: ${currentChallenge.text}...`);
    }, 600);

    setTimeout(async () => {
      setScanProgress(85);
      setServerStatus('Comparing Biometric Face Embedding & Action Challenge Signature...');

      try {
        const response = await api.verifyStep1Face({
          faceImage: frameB64,
          targetUserId,
          performedAction: currentChallenge.id,
          challengeType: currentChallenge.id
        });

        setScanProgress(100);
        setMatchResult(response);
        setLivenessPassed(true);
        sound.playFaceMatched();
        sound.playAccessGranted();
        setFailedAttempts(0);

        // Advance to Authenticated Session / Identity Wallet
        setTimeout(() => {
          stopCamera();
          onSuccess(response);
        }, 1200);

      } catch (err) {
        setScanning(false);
        sound.playAccessDenied();

        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);

        if (newFailed >= 3) {
          const lockTime = Date.now() + 60 * 1000;
          setLockedUntil(lockTime);
          setLockCountdown(60);
          setErrorMsg('PROGRESSIVE LOCKOUT TRIGGERED: 3 consecutive authentication failures. System temporarily locked for 60s.');
        } else {
          setErrorMsg(`${err.message || 'Liveness & Face Verification Failed.'} (${newFailed}/3 attempts used)`);
        }

        pickRandomChallenge();
      } finally {
        setScanning(false);
      }
    }, 1400);
  };

  const IconComp = currentChallenge.icon;

  return (
    <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Face ID & Video Liveness Challenge
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Biometric vector matching + randomized real-time action check
            </p>
          </div>
        </div>

        {/* Failure Counter / Lockout status */}
        <div className="flex items-center gap-2">
          {failedAttempts > 0 && !lockedUntil && (
            <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-950/80 text-amber-400 border border-amber-800/80 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Failed: {failedAttempts}/3</span>
            </span>
          )}

          {lockedUntil && (
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1.5 animate-pulse">
              <Lock className="w-3.5 h-3.5" />
              <span>LOCKED ({lockCountdown}s)</span>
            </span>
          )}
        </div>
      </div>

      {/* Progressive Lockout Alert Banner */}
      {lockedUntil && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-mono flex items-start gap-3 animate-fade-in shadow-lg">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-100 text-sm">SECURITY LOCKOUT ACTIVE</div>
            <p className="mt-1 text-rose-300">
              Access temporarily restricted after 3 consecutive failed liveness attempts.
              Identity claims remain encrypted and inaccessible until lockout expires in <strong className="text-white font-bold">{lockCountdown} seconds</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Randomized Action Challenge Banner */}
      {!lockedUntil && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <IconComp className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-cyan-400 tracking-wider font-bold">
                REQUIRED LIVENESS ACTION CHALLENGE
              </span>
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                "{currentChallenge.text}"
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{currentChallenge.hint}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={pickRandomChallenge}
            disabled={scanning || !!lockedUntil}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors shrink-0 cursor-pointer"
          >
            New Challenge 🎲
          </button>
        </div>
      )}

      {/* Camera Feed Viewport */}
      <div className="relative rounded-xl overflow-hidden bg-[#03060c] border border-slate-800 aspect-video flex items-center justify-center shadow-inner">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
            cameraActive ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {!cameraActive && !lockedUntil && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/90">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">Camera Standby</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 font-mono">
              {cameraError || 'Allow camera access to complete the face match and random video challenge.'}
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium hover:bg-cyan-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Connect Camera</span>
            </button>
          </div>
        )}

        {/* Scanning & Challenge Status */}
        {scanning && (
          <div className="absolute bottom-4 left-4 right-4 z-30 bg-slate-950/90 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/50 shadow-2xl">
            <div className="flex justify-between items-center text-xs font-mono text-cyan-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                {serverStatus}
              </span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {matchResult && (
          <div className="absolute inset-0 z-40 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 cyber-glow-emerald">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
              BIOMETRIC & LIVENESS VERIFIED
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              {matchResult.matchedUser?.name || matchResult.user?.name}
            </h3>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              Face Vector Confidence: {matchResult.confidencePercent}% • Liveness Challenge Passed
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && !lockedUntil && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-200">Authentication Failed</div>
            <p className="mt-0.5 text-rose-300/90 text-[11px]">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Actions & Directory */}
      <div className="mt-6 space-y-4">
        <button
          onClick={() => handlePerformScan()}
          disabled={scanning || !!matchResult || !!lockedUntil}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {scanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying Face Match & Challenge...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Perform Video Challenge & Verify Identity</span>
            </>
          )}
        </button>

        {/* Directory Quick Selector */}
        {demoUsers && demoUsers.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Registered Enrolled Directory ({demoUsers.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handlePerformScan(u.id)}
                  disabled={scanning || !!matchResult || !!lockedUntil}
                  className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={u.avatar_url || u.avatarUrl}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {u.email}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
