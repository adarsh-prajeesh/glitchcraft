import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StepWizard from './components/StepWizard';
import FaceScanStep from './components/FaceScanStep';
import Dashboard from './components/Dashboard';
import AdminEnrollment from './components/AdminEnrollment';
import { api } from './services/api';
import { sound } from './services/sound';
import { ShieldCheck, Video, Key } from 'lucide-react';

export default function App() {
  const initialView = window.location.pathname === '/admin' || window.location.hash === '#admin' ? 'admin' : 'auth';

  const [currentView, setView] = useState(initialView); // 'auth' | 'dashboard' | 'admin'
  const [authStep, setAuthStep] = useState(1);
  const [step1Data, setStep1Data] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [soundMuted, setSoundMuted] = useState(false);

  // Sync view changes to URL history
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

  // Load enrolled identity directory
  const fetchUsers = async () => {
    try {
      const users = await api.getUsers();
      setDemoUsers(users);
    } catch (e) {
      console.error('Failed to load identity directory:', e);
    }
  };

  useEffect(() => {
    fetchUsers();

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

  // Face + Video Liveness Challenge Success Handler
  const handleStep1Success = (data) => {
    setStep1Data(data);
    setAuthToken(data.authToken);
    setAuthenticatedUser(data.user);
    handleSetView('dashboard');

    // Broadcast authenticated session to Chrome Extension Identity Wallet
    const sessionPayload = {
      user: data.user,
      authToken: data.authToken,
      claims: data.claims || [],
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

  // Logout / Lock Wallet
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

  return (
    <div className="min-h-screen bg-[#060911] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Header */}
      <Navbar
        currentView={currentView}
        setView={handleSetView}
        authenticatedUser={authenticatedUser}
        onLogout={handleLogout}
        soundMuted={soundMuted}
        toggleSound={toggleSound}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {/* VIEW 1: Face ID & Video Liveness Gateway */}
        {currentView === 'auth' && (
          <div className="w-full animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-mono mb-3 shadow-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>DIGITAL IDENTITY WALLET GATEWAY</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Biometric & Video Liveness Verification
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto font-mono">
                Verify your identity once with facial biometric matching and a randomized video challenge. Securely reuse identity claims across trusted websites.
              </p>
            </div>

            {/* Stepper */}
            <StepWizard
              currentStep={authStep}
              step1Data={step1Data}
              step2Data={authenticatedUser}
            />

            {/* Face ID & Liveness Challenge */}
            <FaceScanStep
              onSuccess={handleStep1Success}
              demoUsers={demoUsers}
            />
          </div>
        )}

        {/* VIEW 2: Digital Identity Wallet Dashboard */}
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
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#04060c] py-4 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>DIGITAL IDENTITY WALLET LAYER // PROVE, DON'T EXPOSE</span>
          </div>
          <div>
            Browser-Based Identity Verification & Cryptographic Proof Engine
          </div>
        </div>
      </footer>
    </div>
  );
}
