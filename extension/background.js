/**
 * CampusPass SSO Assistant - Background Service Worker (Manifest V3)
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
  console.log('[CampusPass SSO] Service worker initialized.');
});

// Update extension icon badge
function updateBadge(session) {
  if (session && session.user && isSessionValid(session)) {
    chrome.action.setBadgeText({ text: 'SSO' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Emerald green
    chrome.action.setTitle({ title: `CampusPass Active: Signed in as ${session.user.name}` });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'CampusPass SSO: Logged Out' });
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
      timestamp: payload.timestamp || Date.now(),
      origin: sender.tab?.url || 'campus-portal'
    };

    chrome.storage.local.set({ session }, () => {
      updateBadge(session);
      console.log(`[CampusPass SSO] Session saved for: ${session.user.name} (${session.user.email})`);
      sendResponse({ success: true, user: session.user });
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
      console.log('[CampusPass SSO] Session cleared.');
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
});
