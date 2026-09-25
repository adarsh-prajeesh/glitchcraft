/**
 * Digital Identity Wallet Assistant - Popup Controller
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
  const claimsList = document.getElementById('claims-list');

  const inputKey = document.getElementById('input-claim-key');
  const inputVal = document.getElementById('input-claim-val');
  const selectCat = document.getElementById('select-claim-cat');
  const btnAddClaim = document.getElementById('btn-add-claim');

  const btnTestPortal = document.getElementById('btn-test-portal');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenGateway = document.getElementById('btn-open-gateway');

  const toggleAutoSubmit = document.getElementById('toggle-auto-submit');
  const toggleShowOverlay = document.getElementById('toggle-show-overlay');

  // Load session & claims
  function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_SESSION' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        renderUnauthenticated();
        return;
      }

      const { active, session, settings } = response;

      if (settings) {
        toggleAutoSubmit.checked = settings.autoSubmit ?? true;
        toggleShowOverlay.checked = settings.showOverlay ?? true;
      }

      if (active && session && session.user) {
        renderAuthenticated(session.user, session.claims || []);
      } else {
        renderUnauthenticated();
      }
    });
  }

  function renderAuthenticated(user, claims) {
    statusPill.className = 'status-pill online';
    statusText.textContent = 'Wallet Active';

    viewAuth.classList.remove('hidden');
    viewUnauth.classList.add('hidden');

    userAvatar.src = user.avatar_url || user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
    userName.textContent = user.name || 'Verified Identity';
    userEmail.textContent = user.email || 'user@example.com';
    userCourse.textContent = user.course || 'Computer Science';
    userAge.textContent = user.age || '21';

    // Render claims list
    claimsList.innerHTML = '';
    const defaultClaims = [
      { claim_key: 'Name', claim_value: user.name, category: 'basic' },
      { claim_key: 'Email', claim_value: user.email, category: 'basic' },
      { claim_key: 'Student ID', claim_value: user.id || 'ID-8801', category: 'basic' },
      { claim_key: 'National SSN / Gov ID', claim_value: 'GOV-881920-IND', category: 'protected' },
      ...claims
    ];

    defaultClaims.forEach(c => {
      const item = document.createElement('div');
      item.className = 'claim-row';
      item.innerHTML = `
        <div class="claim-info">
          <span class="claim-key">${c.claim_key}</span>
          <span class="claim-val">${c.claim_value}</span>
        </div>
        <span class="claim-badge ${c.category === 'protected' ? 'protected' : 'basic'}">
          ${c.category === 'protected' ? '🔒 Protected' : '🔓 Basic'}
        </span>
      `;
      claimsList.appendChild(item);
    });
  }

  function renderUnauthenticated() {
    statusPill.className = 'status-pill offline';
    statusText.textContent = 'Standby';

    viewAuth.classList.add('hidden');
    viewUnauth.classList.remove('hidden');
  }

  // Add Custom Credential
  btnAddClaim.addEventListener('click', () => {
    const key = inputKey.value.trim();
    const val = inputVal.value.trim();
    const cat = selectCat.value;

    if (!key || !val) return;

    chrome.runtime.sendMessage({
      type: 'ADD_WALLETS_CLAIM',
      payload: { claim_key: key, claim_value: val, category: cat }
    }, () => {
      inputKey.value = '';
      inputVal.value = '';
      loadState();
    });
  });

  // Open test portal
  btnTestPortal.addEventListener('click', () => {
    const testUrl = chrome.runtime.getURL('test-partner-site/index.html');
    chrome.tabs.create({ url: testUrl });
  });

  // Open gateway
  btnOpenGateway.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  });

  // Logout
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

  loadState();
});
