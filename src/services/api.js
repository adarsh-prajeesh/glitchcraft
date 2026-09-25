/**
 * API Client for Digital Identity Wallet & Cryptographic Proof Engine
 */

const API_BASE = '/api';

export const api = {
  // Face ID & Randomized Video Liveness Action Challenge
  async verifyStep1Face({ faceImage, targetUserId, performedAction, challengeType }) {
    const res = await fetch(`${API_BASE}/auth/step1-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceImage, targetUserId, performedAction, challengeType })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Facial & Liveness verification failed');
    return data;
  },

  // Auto-login via session_id token
  async loginWithSessionId(sessionId) {
    const res = await fetch(`${API_BASE}/auth/session-login?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Session auto-login failed');
    return data;
  },

  // Wallet Identity Claims
  async getClaims(userId) {
    const res = await fetch(`${API_BASE}/wallet/claims${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch wallet claims');
    return res.json();
  },

  async addClaim({ userId, claimKey, claimValue, category }) {
    const res = await fetch(`${API_BASE}/wallet/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, claimKey, claimValue, category })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add claim');
    return data;
  },

  // Cryptographic Proof Generation
  async generateProof({ targetDomain, claimsToProve, userId }) {
    const res = await fetch(`${API_BASE}/auth/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDomain, claimsToProve, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Proof generation failed');
    return data;
  },

  // Verifier Cryptographic Proof Verification
  async verifyProof(proof) {
    const res = await fetch(`${API_BASE}/verifier/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Proof verification failed');
    return data;
  },

  // Trusted Websites
  async getTrustedSites() {
    const res = await fetch(`${API_BASE}/trusted-sites`);
    if (!res.ok) throw new Error('Failed to load trusted websites');
    return res.json();
  },

  async checkSiteTrust(domain) {
    const res = await fetch(`${API_BASE}/trusted-sites/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    });
    return res.json();
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

  // Directory of Personnel
  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to load user directory');
    return res.json();
  },

  // Delete / Remove Personnel from Directory
  async deleteUser(userId) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete user');
    return data;
  },

  // Update Personnel Profile in Directory
  async updateUser(userId, userData) {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update user profile');
    return data;
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
