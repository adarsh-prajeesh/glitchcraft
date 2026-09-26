/**
 * Cross ID SSO Assistant - Background Service Worker (Manifest V3)
 * Manages authenticated user session state, badge indicators, and cross-site SSO authorization.
 */

const DEFAULT_SETTINGS = {
  autoSubmit: true,
  showOverlay: true,
  autoFillDelayMs: 600,
  allowedDomains: ['localhost', '127.0.0.1', 'college.edu.in', 'campus.edu']
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'session']);
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  updateBadge(data.session);
  console.log('[Cross ID SSO] Service worker initialized.');
});

// Update extension icon badge
function updateBadge(session) {
  if (session && session.user && isSessionValid(session)) {
    chrome.action.setBadgeText({ text: 'SSO' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Emerald green
    chrome.action.setTitle({ title: `Cross ID Active: Signed in as ${session.user.name}` });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Cross ID SSO: Logged Out' });
  }
}

function isSessionValid(session) {
  if (!session || !session.timestamp) return false;
  return (Date.now() - session.timestamp) < SESSION_TTL_MS;
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === 'SAVE_AUTH_SESSION') {
    const session = {
      user: payload.user,
      authToken: payload.authToken,
      token: payload.authToken,
      timestamp: payload.timestamp || Date.now(),
      origin: sender.tab?.url || 'crossid-portal'
    };

    chrome.storage.local.set({ session, token: payload.authToken, authToken: payload.authToken }, () => {
      updateBadge(session);
      console.log(`[Cross ID SSO] Session & Token saved into extension storage for: ${session.user.name}`);
      sendResponse({ success: true, user: session.user, token: payload.authToken });
    });
    return true; // Keep message channel open for async response
  }

  if (type === 'GET_AUTH_SESSION') {
    chrome.storage.local.get(['session', 'settings'], (data) => {
      const session = data.session;
      const settings = data.settings || DEFAULT_SETTINGS;
      const valid = isSessionValid(session);

      if (session && !valid) {
        // Expired
        chrome.storage.local.remove(['session']);
        updateBadge(null);
        sendResponse({ active: false, session: null, settings });
      } else {
        updateBadge(session);
        sendResponse({
          active: valid,
          session: valid ? session : null,
          settings
        });
      }
    });
    return true;
  }

  if (type === 'CLEAR_AUTH_SESSION') {
    chrome.storage.local.remove(['session'], () => {
      updateBadge(null);
      console.log('[Cross ID SSO] Session cleared.');
      sendResponse({ success: true });
    });
    return true;
  }

  if (type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], (data) => {
      sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (type === 'UPDATE_SETTINGS') {
    chrome.storage.local.get(['settings'], (data) => {
      const updated = { ...(data.settings || DEFAULT_SETTINGS), ...payload };
      chrome.storage.local.set({ settings: updated }, () => {
        sendResponse({ success: true, settings: updated });
      });
    });
    return true;
  }

  if (type === 'GET_SITE_VAULT') {
    const { userId, domain } = payload;
    chrome.storage.local.get(['user_vaults'], (data) => {
      const vaults = data.user_vaults || {};
      const userVault = vaults[userId] || {};
      const domainData = userVault[domain] || userVault['default'] || null;
      sendResponse({ success: true, vault: domainData });
    });
    return true;
  }

  if (type === 'SAVE_SITE_VAULT') {
    const { userId, domain, vaultData } = payload;
    chrome.storage.local.get(['user_vaults'], (data) => {
      const vaults = data.user_vaults || {};
      if (!vaults[userId]) vaults[userId] = {};
      vaults[userId][domain] = vaultData;
      chrome.storage.local.set({ user_vaults: vaults }, () => {
        sendResponse({ success: true, vault: vaultData });
      });
    });
    return true;
  }
});
