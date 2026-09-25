/**
 * API Client for AegisGuard MFA Backend
 * Sequential Face ID Biometrics & ID Card Barcode Authentication
 */

const API_BASE = '/api';

export const api = {
  // Step 1: Face ID Scan (Sends camera image to server-side recognition engine)
  async verifyStep1Face({ faceImage, simulatedUserId, testBypass }) {
    const res = await fetch(`${API_BASE}/auth/step1-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceImage, simulatedUserId, testBypass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server-side facial verification failed');
    return data;
  },

  // Step 2: ID Card Barcode Scan
  async verifyStep2Barcode({ step1Token, barcodePayload }) {
    const res = await fetch(`${API_BASE}/auth/step2-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step1Token, barcodePayload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Physical ID barcode scan verification failed');
    return data;
  },

  // User Profile
  async getUserProfile(token) {
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
    return data;
  },

  // Recalibrate / Update Face Embedding on Server
  async updateFace(token, faceImage) {
    const res = await fetch(`${API_BASE}/user/update-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ faceImage })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update biometric template');
    return data;
  },

  // Directory of Personnel
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to load user directory');
    return res.json();
  },

  // Security Audit Logs
  async getAuditLogs(limit = 25) {
    const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  // Register / Enroll New Personnel
  async registerUser(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to enroll user');
    return data;
  },

  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }
};
