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
import { GraduationCap, Sparkles } from 'lucide-react';

export default function App() {
  // Support path routing for /admin if entered directly
  const initialView = window.location.pathname === '/admin' || window.location.hash === '#admin' ? 'admin' : 'auth';

  const [currentView, setView] = useState(initialView); // 'auth' | 'dashboard' | 'admin'
  const [authStep, setAuthStep] = useState(1); // 1: Face ID, 2: Barcode
  const [step1Data, setStep1Data] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [soundMuted, setSoundMuted] = useState(false);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  // Sync view changes to URL hash/history
  const handleSetView = (view) => {
    setView(view);
    if (view === 'admin') {
      window.history.replaceState(null, '', '/admin');
    } else if (view === 'dashboard') {
      window.history.replaceState(null, '', '/dashboard');
    } else {
      window.history.replaceState(null, '', '/');
    }
  };

  // Load enrolled students on mount
  const fetchUsers = async () => {
    try {
      const users = await api.getUsers();
      setDemoUsers(users);
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Listen to browser forward/back buttons
    const handlePopState = () => {
      if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
        setView('admin');
      } else if (window.location.pathname === '/dashboard') {
        setView('dashboard');
      } else {
        setView('auth');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleSound = () => {
    const nextMuted = !soundMuted;
    sound.setMuted(nextMuted);
    setSoundMuted(nextMuted);
  };

  // Step 1 Success Handler (Face verified on server)
  const handleStep1Success = (data) => {
    setStep1Data(data);
    setAuthStep(2); // Advance to Step 2: Barcode
  };

  // Step 2 Success Handler (Barcode verified on server)
  const handleStep2Success = (data) => {
    setAuthToken(data.authToken);
    setAuthenticatedUser(data.user);
    handleSetView('dashboard');

    // Broadcast authenticated session to CampusPass Chrome Extension SSO Assistant
    const sessionPayload = {
      user: data.user,
      authToken: data.authToken,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('campuspass_auth_session', JSON.stringify(sessionPayload));
      window.dispatchEvent(new CustomEvent('CAMPUSPASS_AUTH_SYNC', { detail: sessionPayload }));
      window.postMessage({ type: 'CAMPUSPASS_AUTH_SYNC', payload: sessionPayload }, '*');
    } catch (e) {
      console.warn('SSO sync broadcast failed:', e);
    }
  };

  // Logout
  const handleLogout = () => {
    setAuthToken(null);
    setAuthenticatedUser(null);
    setStep1Data(null);
    setAuthStep(1);
    handleSetView('auth');
    sound.playAccessDenied();

    try {
      localStorage.removeItem('campuspass_auth_session');
      window.dispatchEvent(new CustomEvent('CAMPUSPASS_AUTH_LOGOUT'));
      window.postMessage({ type: 'CAMPUSPASS_AUTH_LOGOUT' }, '*');
    } catch (e) {}
  };

  // Back from Barcode to Face
  const handleBackToFace = () => {
    setStep1Data(null);
    setAuthStep(1);
    sound.playClick();
  };

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setView={handleSetView}
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
            {/* Campus Login Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-mono mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>COLLEGE CAMPUS SMART VERIFICATION GATE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Student Biometric & ID Login
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto font-mono">
                Sequential authentication: Step 1 verifies student facial biometric with the server, Step 2 verifies the physical ID card barcode.
              </p>
            </div>

            {/* Stepper */}
            <StepWizard
              currentStep={authStep}
              step1Data={step1Data}
              step2Data={authenticatedUser}
            />

            {/* Step 1: Face ID */}
            {authStep === 1 && (
              <FaceScanStep
                onSuccess={handleStep1Success}
                demoUsers={demoUsers}
                onGoToEnrollment={() => handleSetView('admin')}
              />
            )}

            {/* Step 2: Barcode */}
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

        {/* VIEW 2: Student Dashboard */}
        {currentView === 'dashboard' && (
          <div className="w-full animate-fade-in">
            <Dashboard
              user={authenticatedUser}
              onLogout={handleLogout}
            />
          </div>
        )}

        {/* VIEW 3: Dedicated Admin Portal Page */}
        {currentView === 'admin' && (
          <div className="w-full animate-fade-in">
            <AdminEnrollment
              onBackToGateway={() => handleSetView('auth')}
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

      {/* College Campus Footer */}
      <footer className="border-t border-slate-900 bg-[#04060c] py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>CAMPUS MFA SYSTEM // DOMAIN: @college.edu.in</span>
          </div>
          <div>
            College Student Identification & Biometric Verification
          </div>
        </div>
      </footer>
    </div>
  );
}
