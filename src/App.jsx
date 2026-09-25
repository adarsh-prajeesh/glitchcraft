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

    // Check URL parameters, Cookies, or localStorage for session_id auto-login
    const urlParams = new URLSearchParams(window.location.search);
    const cookieMatch = document.cookie.match(/campuspass_session_id=([^;]+)/) || document.cookie.match(/campuspass_user_id=([^;]+)/);
    const sessionIdFromCookie = cookieMatch ? cookieMatch[1] : null;

    const sessionIdParam = urlParams.get('session_id') || urlParams.get('session') || urlParams.get('token') || sessionIdFromCookie || localStorage.getItem('campuspass_session_id');

    if (sessionIdParam) {
      api.loginWithSessionId(sessionIdParam)
        .then((res) => {
          if (res.success && res.user) {
            handleStep1Success(res);
            localStorage.setItem('campuspass_session_id', res.user.id);
            document.cookie = `campuspass_session_id=${res.user.id}; path=/; max-age=31536000; SameSite=Lax`;
            document.cookie = `campuspass_user_id=${res.user.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
        })
        .catch((err) => {
          console.warn('Session auto-login notice:', err.message);
        });
    }

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

  // Face + Video Liveness Challenge Success Handler
  const handleStep1Success = (data) => {
    setStep1Data(data);
    setAuthToken(data.authToken);
    setAuthenticatedUser(data.user);
    handleSetView('dashboard');

    if (data.user?.id) {
      localStorage.setItem('campuspass_session_id', data.user.id);
      document.cookie = `campuspass_session_id=${data.user.id}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `campuspass_user_id=${data.user.id}; path=/; max-age=31536000; SameSite=Lax`;
    }

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
      document.cookie = 'campuspass_session_id=; path=/; max-age=0;';
      document.cookie = 'campuspass_user_id=; path=/; max-age=0;';
      localStorage.removeItem('campuspass_session_id');
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
