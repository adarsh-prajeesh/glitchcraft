/**
 * CampusPass SSO Assistant - Portal Content Script
 * Injected into the CampusPass / AegisGuard MFA portal.
 * Detects completed 2-Factor logins (Face ID + Barcode) and synchronizes credentials to the extension.
 */

(function () {
  // Mark extension presence in DOM window
  try {
    const script = document.createElement('script');
    script.textContent = 'window.__CAMPUSPASS_EXTENSION_CONNECTED__ = true; window.dispatchEvent(new CustomEvent("CAMPUSPASS_EXT_READY"));';
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (e) {}

  // Sync session to background service worker
  function syncSessionToExtension(sessionData) {
    if (!sessionData || !sessionData.user) return;
    chrome.runtime.sendMessage({
      type: 'SAVE_AUTH_SESSION',
      payload: sessionData
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('[CampusPass SSO Content] Extension communication notice:', chrome.runtime.lastError.message);
      } else {
        console.log('[CampusPass SSO Content] Successfully synced user session:', sessionData.user.name);
      }
    });
  }

  // Clear session from background
  function clearSessionFromExtension() {
    chrome.runtime.sendMessage({
      type: 'CLEAR_AUTH_SESSION'
    }, () => {});
  }

  // Listen for custom event dispatched by App.jsx
  window.addEventListener('CAMPUSPASS_AUTH_SYNC', (event) => {
    if (event.detail) {
      syncSessionToExtension(event.detail);
    }
  });

  // Listen for window.postMessage from portal
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CAMPUSPASS_AUTH_SYNC' && event.data.payload) {
      syncSessionToExtension(event.data.payload);
    } else if (event.data && event.data.type === 'CAMPUSPASS_AUTH_LOGOUT') {
      clearSessionFromExtension();
    }
  });

  window.addEventListener('CAMPUSPASS_AUTH_LOGOUT', () => {
    clearSessionFromExtension();
  });

  // Check localStorage on page load (in case user was already logged in)
  function inspectLocalStorage() {
    try {
      const stored = localStorage.getItem('campuspass_auth_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.user && parsed.authToken) {
          syncSessionToExtension(parsed);
        }
      }
    } catch (e) {}
  }

  // Initial inspection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inspectLocalStorage);
  } else {
    inspectLocalStorage();
  }

  // Re-check periodically in background in case React state updated localStorage
  setInterval(inspectLocalStorage, 4000);
})();
