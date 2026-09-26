/**
 * Cross ID SSO Assistant - Portal Content Script
 * Injected into the Cross ID MFA portal.
 * Detects completed logins and synchronizes credentials to the extension.
 */

(function () {
  // Mark extension presence in DOM window without CSP inline script violation
  try {
    document.documentElement.setAttribute('data-crossid-extension', 'true');
    document.documentElement.setAttribute('data-campuspass-extension', 'true');
    window.dispatchEvent(new CustomEvent('CROSSID_EXT_READY'));
    window.dispatchEvent(new CustomEvent('CAMPUSPASS_EXT_READY'));
    window.postMessage({ type: 'CROSSID_EXT_READY' }, '*');
    window.postMessage({ type: 'CAMPUSPASS_EXT_READY' }, '*');
  } catch (e) {}

  // Sync session to background service worker
  function syncSessionToExtension(sessionData) {
    if (!sessionData || !sessionData.user) return;
    chrome.runtime.sendMessage({
      type: 'SAVE_AUTH_SESSION',
      payload: sessionData
    }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn('[Cross ID SSO Content] Extension communication notice:', chrome.runtime.lastError.message);
      } else {
        console.log('[Cross ID SSO Content] Successfully synced user session:', sessionData.user.name);
      }
    });
  }

  // Clear session from background
  function clearSessionFromExtension() {
    chrome.runtime.sendMessage({
      type: 'CLEAR_AUTH_SESSION'
    }, () => {});
  }

  // Listen for custom events dispatched by App.jsx
  window.addEventListener('CROSSID_AUTH_SYNC', (event) => {
    if (event.detail) syncSessionToExtension(event.detail);
  });
  window.addEventListener('CAMPUSPASS_AUTH_SYNC', (event) => {
    if (event.detail) syncSessionToExtension(event.detail);
  });

  // Listen for window.postMessage from portal
  window.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'CROSSID_AUTH_SYNC' || event.data.type === 'CAMPUSPASS_AUTH_SYNC') && event.data.payload) {
      syncSessionToExtension(event.data.payload);
    } else if (event.data && (event.data.type === 'CROSSID_AUTH_LOGOUT' || event.data.type === 'CAMPUSPASS_AUTH_LOGOUT')) {
      clearSessionFromExtension();
    }
  });

  window.addEventListener('CROSSID_AUTH_LOGOUT', clearSessionFromExtension);
  window.addEventListener('CAMPUSPASS_AUTH_LOGOUT', clearSessionFromExtension);

  // Check localStorage on page load
  function inspectLocalStorage() {
    try {
      const stored = localStorage.getItem('crossid_auth_session') || localStorage.getItem('campuspass_auth_session');
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
