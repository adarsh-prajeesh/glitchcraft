import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Camera, Barcode, CheckCircle2, AlertTriangle, RefreshCw, GraduationCap, Users, ArrowLeft, ExternalLink, Calendar, BookOpen, Mail, User } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../services/sound';

export default function AdminEnrollment({ onBackToGateway, onOpenBadges }) {
  const [formData, setFormData] = useState({
    name: '',
    emailPrefix: '',
    course: '',
    age: '',
    barcodePayload: ''
  });

  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

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

  useEffect(() => {
    loadStudents();
  }, []);

  // Start enrollment webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 360, height: 360, facingMode: 'user' }
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

  const handleNameChange = (nameVal) => {
    const defaultPrefix = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '.');
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      emailPrefix: prev.emailPrefix || defaultPrefix
    }));
  };

  const generateBarcode = () => {
    const courseCode = formData.course ? formData.course.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'STU' : 'STU';
    const code = `COL-${courseCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData(prev => ({ ...prev, barcodePayload: code }));
    sound.playBarcodeChirp();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.course.trim() || !formData.age || !formData.barcodePayload.trim()) {
      setErrorMsg('Please complete all required fields: Name, Course, Age, and Barcode Payload.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const email = `${(formData.emailPrefix || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '.'))}@college.edu.in`;

    try {
      const payload = {
        name: formData.name.trim(),
        email,
        course: formData.course.trim(),
        age: parseInt(formData.age),
        barcodePayload: formData.barcodePayload.trim(),
        faceImage: faceImageBase64
      };

      const res = await api.registerUser(payload);
      sound.playAccessGranted();
      setSuccessMsg(`Student ${formData.name} (${email}) registered successfully!`);

      // Reset form
      setFormData({
        name: '',
        emailPrefix: '',
        course: '',
        age: '',
        barcodePayload: ''
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
            <h1 className="text-2xl font-bold text-white tracking-tight">College Admin Portal</h1>
            <p className="text-xs text-slate-400 font-mono">
              Student Registration & ID Card Management • @college.edu.in
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

          <button
            onClick={() => { sound.playClick(); onOpenBadges(); }}
            className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-mono border border-cyan-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>View ID Badges</span>
          </button>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="cyber-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Enroll New Student</h2>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            Domain: @college.edu.in
          </span>
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
          {/* Required Fields: Name, Course, Age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Course *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. B.Tech Computer Science"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Age *
              </label>
              <input
                type="number"
                required
                min={15}
                max={99}
                placeholder="e.g. 21"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* College Email Preview */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              College Institutional Email (@college.edu.in)
            </label>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="username"
                value={formData.emailPrefix}
                onChange={(e) => setFormData({ ...formData, emailPrefix: e.target.value })}
                className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-r-0 border-slate-700 rounded-l-xl text-slate-100 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
              <span className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-r-xl text-xs font-mono text-cyan-400 font-semibold select-none">
                @college.edu.in
              </span>
            </div>
          </div>

          {/* Student ID Card Photo (Camera Biometric Capture) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                ID Card Photo & Biometric Face Template
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
                ) : cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-xs text-slate-400 font-mono">
                  Take a photo using the webcam. This photo will appear on the student's ID card and will be used by the server to verify Face ID during login.
                </p>

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  {!cameraActive && !faceCaptured && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-mono border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>
                  )}

                  {cameraActive && (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Snap ID Photo</span>
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

          {/* Barcode Payload Assignment */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-amber-400" />
                Physical ID Card Barcode Payload *
              </span>
              <button
                type="button"
                onClick={generateBarcode}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Auto-Generate Barcode
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="e.g. COL-CSE-2026-001"
              value={formData.barcodePayload}
              onChange={(e) => setFormData({ ...formData, barcodePayload: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:border-amber-400 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              This barcode will be printed on the back of the student's ID card for camera barcode verification.
            </p>
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
                <span>Registering Student to College Database...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>Register Student & Issue ID Card</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Enrolled Students Directory */}
      <div className="cyber-card rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Registered Students Directory</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Students: <strong className="text-cyan-400">{enrolledStudents.length}</strong>
          </span>
        </div>

        {loadingStudents ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            Loading student directory...
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            No students registered yet. Fill out the form above to add the first student.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Age</th>
                  <th className="py-2.5 px-3">College Email</th>
                  <th className="py-2.5 px-3">Barcode Payload</th>
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
                    <td className="py-2.5 px-3 text-cyan-300 whitespace-nowrap">{st.course}</td>
                    <td className="py-2.5 px-3 text-slate-300">{st.age} yrs</td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">{st.email}</td>
                    <td className="py-2.5 px-3 text-amber-300 font-bold whitespace-nowrap">{st.barcode_payload}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
