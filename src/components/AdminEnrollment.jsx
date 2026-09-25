import React, { useState, useRef } from 'react';
import { UserPlus, Camera, Barcode, CheckCircle2, AlertTriangle, RefreshCw, Shield, Sparkles, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function AdminEnrollment({ onUserEnrolled, onOpenBadges }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    department: 'Cyber Operations',
    clearanceLevel: 3,
    barcodePayload: '',
    avatarUrl: ''
  });

  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start enrollment webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (e) {
      console.warn('Enrollment camera error:', e);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    const b64 = canvas.toDataURL('image/jpeg', 0.85);

    setFaceImageBase64(b64);
    setFaceCaptured(true);
    sound.playFaceMatched();
    stopCamera();
  };

  const generateRandomBarcode = () => {
    const code = `AUTH-${formData.name ? formData.name.split(' ')[0].toUpperCase() : 'USER'}-${Math.floor(1000 + Math.random() * 9000)}-L${formData.clearanceLevel}`;
    setFormData(prev => ({ ...prev, barcodePayload: code }));
    sound.playBarcodeChirp();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role || !formData.barcodePayload) {
      setErrorMsg('Please complete all required fields including the Barcode payload.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...formData,
        faceImage: faceImageBase64
      };

      const res = await api.registerUser(payload);
      sound.playAccessGranted();
      setSuccessMsg(`Personnel ${formData.name} enrolled successfully! 128-d facial vector indexed and ID Barcode registered.`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        role: '',
        department: 'Cyber Operations',
        clearanceLevel: 3,
        barcodePayload: '',
        avatarUrl: ''
      });
      setFaceCaptured(false);
      setFaceImageBase64(null);

      if (onUserEnrolled) onUserEnrolled();
    } catch (err) {
      sound.playAccessDenied();
      setErrorMsg(err.message || 'Enrollment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto cyber-card rounded-2xl p-6 sm:p-8 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Personnel Enrollment Console</h2>
            <p className="text-xs text-slate-400 font-mono">
              Register new agent with Server-Side Biometric Face Reference & ID Barcode
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBadges}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>View Badges</span>
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-emerald-200">Enrollment Complete</div>
            <p className="mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-200">Enrollment Error</div>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personnel Profile Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Full Legal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Commander Marcus Vance"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Defense Email Address *</label>
            <input
              type="email"
              required
              placeholder="m.vance@aegis.defense.gov"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Operational Role *</label>
            <input
              type="text"
              required
              placeholder="Senior Quantum Cryptographer"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Security Clearance Level (1 - 5)</label>
            <select
              value={formData.clearanceLevel}
              onChange={(e) => setFormData({ ...formData, clearanceLevel: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
            >
              <option value={1}>Level 1 - Public Operations</option>
              <option value={2}>Level 2 - Confidential Internal</option>
              <option value={3}>Level 3 - Secret / Bio-Lab Access</option>
              <option value={4}>Level 4 - Top Secret Infrastructure</option>
              <option value={5}>Level 5 - Quantum Classified Protocol</option>
            </select>
          </div>
        </div>

        {/* Biometric Face Snapshot Capture */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-400" />
              1. Biometric Reference Photo (Vector Extraction)
            </span>
            {faceCaptured && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                PHOTO CAPTURED & READY
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-32 h-32 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center relative">
              {faceImageBase64 ? (
                <img src={faceImageBase64} alt="Captured" className="w-full h-full object-cover" />
              ) : cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
              ) : (
                <Camera className="w-8 h-8 text-slate-600" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xs text-slate-400 font-mono">
                Capture a high-definition reference photo to generate the 128-dimensional biometric vector on the server.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {!cameraActive && !faceCaptured && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-mono border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Camera</span>
                  </button>
                )}

                {cameraActive && (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Snap Biometric Frame</span>
                  </button>
                )}

                {faceCaptured && (
                  <button
                    type="button"
                    onClick={() => { setFaceCaptured(false); setFaceImageBase64(null); startCamera(); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer"
                  >
                    Retake Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Physical ID Barcode Assignment */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-amber-400" />
              2. Physical ID Card Barcode Assignment *
            </span>
            <button
              type="button"
              onClick={generateRandomBarcode}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Auto-Generate Barcode
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. AUTH-VANCE-8801-L5"
              value={formData.barcodePayload}
              onChange={(e) => setFormData({ ...formData, barcodePayload: e.target.value })}
              className="flex-1 px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Indexing Biometrics & Storing Credentials...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Enroll Personnel into AegisGuard Directory</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
