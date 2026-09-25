import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StepWizard from './components/StepWizard';
import FaceScanStep from './components/FaceScanStep';
import BarcodeScanStep from './components/BarcodeScanStep';
import Dashboard from './components/Dashboard';
import AdminEnrollment from './components/AdminEnrollment';
import BadgeModal from './components/BadgeModal';
import { api } from './services/api';
import { sound } from './services/sound';
import { Shield, Lock, Terminal, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentView, setView] = useState('auth'); // 'auth' | 'dashboard' | 'enrollment'
  const [authStep, setAuthStep] = useState(1); // 1: Face ID, 2: Barcode
  const [step1Data, setStep1Data] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [soundMuted, setSoundMuted] = useState(false);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Load registered users on mount
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const users = await api.getUsers();
      setDemoUsers(users);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    sound.setMuted(nextMuted);
    setSoundMuted(nextMuted);
  };

  // Step 1 Success Handler (Face Biometric verified on server)
  const handleStep1Success = (data) => {
    setStep1Data(data);
    setAuthStep(2); // Advance to Step 2: Barcode
  };

  // Step 2 Success Handler (ID Barcode verified against same user)
  const handleStep2Success = (data) => {
    setAuthToken(data.authToken);
    setAuthenticatedUser(data.user);
    setView('dashboard');
  };

  // Logout / Terminate Session
  const handleLogout = () => {
    setAuthToken(null);
    setAuthenticatedUser(null);
    setStep1Data(null);
    setAuthStep(1);
    setView('auth');
    sound.playAccessDenied();
  };

  // Back from Barcode to Face
  const handleBackToFace = () => {
    setStep1Data(null);
    setAuthStep(1);
    sound.playClick();
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setView={setView}
        authenticatedUser={authenticatedUser}
        onLogout={handleLogout}
        soundMuted={soundMuted}
        toggleSound={toggleSound}
        onOpenBadges={() => setBadgesModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {/* VIEW 1: Multi-Factor Authentication Gate */}
        {currentView === 'auth' && (
          <div className="w-full animate-fade-in">
            {/* Mission Hero Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SEQUENTIAL 2-FACTOR BIOMETRIC & OPTICAL GATE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                AegisGuard Security Gateway
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto font-mono">
                Access is granted ONLY when both facial biometrics and the physical ID card barcode match the exact same registered personnel profile.
              </p>
            </div>

            {/* Stepper */}
            <StepWizard
              currentStep={authStep}
              step1Data={step1Data}
              step2Data={authenticatedUser}
            />

            {/* Sequential Step Component */}
            {authStep === 1 && (
              <FaceScanStep
                onSuccess={handleStep1Success}
                demoUsers={demoUsers}
                onGoToEnrollment={() => setView('enrollment')}
              />
            )}

            {authStep === 2 && (
              <BarcodeScanStep
                step1Data={step1Data}
                onSuccess={handleStep2Success}
                onBack={handleBackToFace}
                onOpenBadges={() => setBadgesModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* VIEW 2: Secured User Dashboard */}
        {currentView === 'dashboard' && (
          <div className="w-full animate-fade-in">
            <Dashboard
              user={authenticatedUser}
              authToken={authToken}
              onLogout={handleLogout}
              onOpenBadges={() => setBadgesModalOpen(true)}
            />
          </div>
        )}

        {/* VIEW 3: Admin Enrollment Console */}
        {currentView === 'enrollment' && (
          <div className="w-full animate-fade-in">
            <AdminEnrollment
              onUserEnrolled={fetchUsers}
              onOpenBadges={() => setBadgesModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Printable ID Badges Modal */}
      <BadgeModal
        isOpen={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
        users={demoUsers}
      />

      {/* High-Tech Cyber Footer */}
      <footer className="border-t border-slate-900 bg-[#04060c] py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>SYSTEM INTEGRITY: VERIFIED (SQLite WAL // 128-D VECTOR ENGINE)</span>
          </div>
          <div>
            AegisGuard Defense Systems • All Biometrics Processed Ephemerally on Secure Host
          </div>
        </div>
      </footer>
    </div>
  );
}
