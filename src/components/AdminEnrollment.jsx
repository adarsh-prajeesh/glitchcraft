import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Camera, CheckCircle2, AlertTriangle, RefreshCw, GraduationCap, Users, ArrowLeft, ExternalLink, Calendar, BookOpen, Mail, User, Upload, Download, Trash2, Pencil, X, Save } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function AdminEnrollment({ onBackToGateway, onOpenBadges }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    age: ''
  });

  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    course: '',
    age: '',
    avatarUrl: '',
    faceImage: null
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Load enrolled students
  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      const list = await api.getUsers();
      setEnrolledStudents(list);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenEdit = (user) => {
    sound.playClick();
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      course: user.course || '',
      age: user.age || '',
      avatarUrl: user.avatar_url || user.reference_photo || '',
      faceImage: null
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);

    try {
      await api.updateUser(editingUser.id, editFormData);
      sound.playAccessGranted();
      setSuccessMsg(`Personnel ${editFormData.name} (${editingUser.id}) updated successfully!`);
      setEditingUser(null);
      loadStudents();
    } catch (err) {
      sound.playAccessDenied();
      setEditError(err.message || 'Failed to update user details.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditFormData(prev => ({
        ...prev,
        avatarUrl: ev.target.result,
        faceImage: ev.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} (${userId}) from the identity directory?`)) {
      return;
    }
    try {
      sound.playClick();
      await api.deleteUser(userId);
      sound.playAccessGranted();
      setSuccessMsg(`Personnel ${name} removed from directory successfully.`);
      loadStudents();
    } catch (err) {
      sound.playAccessDenied();
      setErrorMsg(err.message || 'Failed to remove user');
    }
  };

  useEffect(() => {
    loadStudents();
    return () => {
      stopCamera();
    };
  }, []);

  // Ensure video element receives stream when cameraActive becomes true
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [cameraActive]);

  // Start enrollment webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      setCameraLoading(true);

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Webcam not supported or requires a secure origin (HTTPS or localhost).');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (e) {
      console.warn('Enrollment camera error:', e);
      setCameraError(e.message || 'Camera access unavailable or permission not granted.');
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
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

  const handleRetakePhoto = () => {
    setFaceCaptured(false);
    setFaceImageBase64(null);
    setCameraError(null);
    startCamera();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFaceImageBase64(ev.target.result);
      setFaceCaptured(true);
      setCameraError(null);
      stopCamera();
      sound.playFaceMatched();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrorMsg('Please complete required fields: Name and Email.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        course: formData.course.trim() || 'General',
        age: parseInt(formData.age) || 20,
        faceImage: faceImageBase64
      };

      const res = await api.registerUser(payload);
      sound.playAccessGranted();
      setSuccessMsg(`Student ${formData.name} (${formData.email}) registered successfully!`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        course: '',
        age: ''
      });
      setFaceCaptured(false);
      setFaceImageBase64(null);

      // Refresh list
      loadStudents();
    } catch (err) {
      sound.playAccessDenied();
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-400 font-mono">
              Personnel Enrollment & SSO Extension Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToGateway && (
            <button
              onClick={() => { sound.playClick(); onBackToGateway(); }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          )}

          {onOpenBadges && (
            <button
              onClick={() => { sound.playClick(); onOpenBadges(); }}
              className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-mono border border-cyan-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>View Directory</span>
            </button>
          )}
        </div>
      </div>

      {/* Chrome Extension SSO Download & Install Card */}
      <div className="cyber-card rounded-2xl p-6 border border-emerald-500/30 bg-emerald-950/20 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">CampusPass Chrome Extension</h3>
              <p className="text-xs text-emerald-300 font-mono">
                Stores authentication token into Chrome storage for single sign-on across other websites
              </p>
            </div>
          </div>
          <a
            href="/api/download-extension"
            download="extension.zip"
            onClick={() => sound.playClick()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold border border-emerald-400/40 shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer decoration-none"
          >
            <Download className="w-4 h-4" />
            <span>Install Chrome Extension (.zip)</span>
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-300">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Step 1: Download</span>
            Click button above to download <code className="text-cyan-300">extension.zip</code> and extract it.
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Step 2: Chrome Extensions</span>
            Open <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">chrome://extensions</code> in Chrome.
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Step 3: Developer Mode</span>
            Turn on <strong className="text-white">Developer mode</strong> in top-right.
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">Step 4: Load Unpacked</span>
            Click <strong className="text-white">Load unpacked</strong> and select the extracted folder.
          </div>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Enroll New Student</h2>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-emerald-200">Registration Successful</div>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-200">Registration Error</div>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Name */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Student Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. rahul@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Course / Department
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Age
              </label>
              <input
                type="number"
                min={15}
                max={99}
                placeholder="e.g. 21"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Student Photo / Biometric Face Template */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                Biometric Face Template (Camera / Upload)
              </span>
              {faceCaptured && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  PHOTO CAPTURED
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-32 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                {faceImageBase64 ? (
                  <img src={faceImageBase64} alt="Student Snapshot" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover -scale-x-100 ${cameraActive ? 'block' : 'hidden'}`}
                    />
                    {!cameraActive && (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        {cameraLoading ? (
                          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                        ) : (
                          <Camera className="w-8 h-8 text-slate-600" />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-mono">
                  Take a photo using the webcam or upload a portrait. The facial template is processed on the server to authenticate Face ID.
                </p>

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  {!cameraActive && !faceCaptured && (
                    <button
                      type="button"
                      onClick={() => { sound.playClick(); startCamera(); }}
                      disabled={cameraLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-mono border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {cameraLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening Camera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Open Camera</span>
                        </>
                      )}
                    </button>
                  )}

                  {cameraActive && (
                    <>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer border border-slate-700"
                      >
                        Close Camera
                      </button>
                    </>
                  )}

                  {faceCaptured && (
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer border border-slate-700"
                    >
                      Retake Photo
                    </button>
                  )}

                  <label className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                {cameraError && (
                  <p className="text-xs text-rose-400 font-mono mt-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </p>
                )}
              </div>
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
                <span>Registering Personnel...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Enroll Personnel</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Enrolled Directory */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Enrolled Directory</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Records: <strong className="text-cyan-400">{enrolledStudents.length}</strong>
          </span>
        </div>

        {loadingStudents ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            Loading directory...
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            No personnel registered yet. Fill out the form above to enroll.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {enrolledStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 flex items-center gap-2 whitespace-nowrap">
                      <img
                        src={st.avatar_url || st.reference_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={st.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <div className="font-bold text-slate-200">{st.name}</div>
                        <div className="text-[10px] text-slate-500">{st.id}</div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">{st.email}</td>
                    <td className="py-2.5 px-3 text-cyan-300 whitespace-nowrap">{st.course}</td>
                    <td className="py-2.5 px-3 text-slate-300">{st.age} yrs</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors cursor-pointer"
                          title="Edit Personnel Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(st.id, st.name)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          title="Remove Personnel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Personnel Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-cyan-500/40 bg-[#090d16] max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Edit Personnel ({editingUser.id})</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Profile Picture Preview & Image URL / Upload */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
                <img
                  src={editFormData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                  alt={editFormData.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-cyan-500/50 shadow-md shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <label className="block text-[11px] font-mono text-slate-400 uppercase">Profile Picture URL</label>
                  <input
                    type="text"
                    value={editFormData.avatarUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, avatarUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload New Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditPhotoUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 uppercase">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 uppercase">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1 uppercase">Course / Dept</label>
                  <input
                    type="text"
                    value={editFormData.course}
                    onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1 uppercase">Age</label>
                  <input
                    type="number"
                    min={15}
                    max={99}
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/20 border border-cyan-400/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
