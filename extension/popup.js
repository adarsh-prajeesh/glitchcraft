/**
 * CampusPass SSO Assistant - Popup UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  const viewAuth = document.getElementById('view-authenticated');
  const viewUnauth = document.getElementById('view-unauthenticated');

  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const userCourse = document.getElementById('user-course');
  const userAge = document.getElementById('user-age');
  const userBarcode = document.getElementById('user-barcode');
  const copyFeedback = document.getElementById('copy-feedback');

  const btnCopyBarcode = document.getElementById('btn-copy-barcode');
  const btnTestPortal = document.getElementById('btn-test-portal');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenGateway = document.getElementById('btn-open-gateway');

  const toggleAutoSubmit = document.getElementById('toggle-auto-submit');
  const toggleShowOverlay = document.getElementById('toggle-show-overlay');

  // Load session & settings from background
  function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_SESSION' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        renderUnauthenticated();
        return;
      }

      const { active, session, settings } = response;

      // Update toggles
      if (settings) {
        toggleAutoSubmit.checked = settings.autoSubmit ?? true;
        toggleShowOverlay.checked = settings.showOverlay ?? true;
      }

      if (active && session && session.user) {
        renderAuthenticated(session.user);
      } else {
        renderUnauthenticated();
      }
    });
  }

  function renderAuthenticated(user) {
    statusPill.className = 'status-pill online';
    statusText.textContent = 'SSO Active';

    viewAuth.classList.remove('hidden');
    viewUnauth.classList.add('hidden');

    userAvatar.src = user.avatar_url || user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
    userName.textContent = user.name || 'Verified Student';
    userEmail.textContent = user.email || 'student@college.edu.in';
    userCourse.textContent = user.course || 'B.Tech CS';
    userAge.textContent = user.age || '21';

    const barcode = user.barcode_payload || user.barcodePayload || 'COL-CSE-8801';
    userBarcode.textContent = barcode;
  }

  function renderUnauthenticated() {
    statusPill.className = 'status-pill offline';
    statusText.textContent = 'Standby';

    viewAuth.classList.add('hidden');
    viewUnauth.classList.remove('hidden');
  }

  // Copy barcode payload
  btnCopyBarcode.addEventListener('click', () => {
    const text = userBarcode.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyFeedback.style.display = 'inline';
      setTimeout(() => {
        copyFeedback.style.display = 'none';
      }, 1500);
    });
  });

  // Open test library partner portal
  btnTestPortal.addEventListener('click', () => {
    const testUrl = chrome.runtime.getURL('test-partner-site/index.html');
    chrome.tabs.create({ url: testUrl });
  });

  // Open central login gateway
  btnOpenGateway.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  });

  // Sign out / Clear session
  btnLogout.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_SESSION' }, () => {
      loadState();
    });
  });

  // Toggle settings
  toggleAutoSubmit.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: { autoSubmit: toggleAutoSubmit.checked }
    });
  });

  toggleShowOverlay.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: { showOverlay: toggleShowOverlay.checked }
    });
  });

  // Initial load
  loadState();
});
