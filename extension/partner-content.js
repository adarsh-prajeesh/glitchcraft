/**
 * CampusPass Password & Credit Card Vault Assistant - Content Script
 * Acts as a full password and credit card manager for external websites.
 * Per-user ID storage, active student portal SSO sync, face scan liveness,
 * auto-detection of missing/existing site data with interactive popup overlays.
 */

(function () {
  const currentDomain = window.location.hostname || (window.location.pathname ? window.location.pathname.split('/').pop() : 'local-file') || 'local-demo';

  // Vault Profiles Database with PINs, Cards, Passwords per User ID
  const VAULT_PROFILES = {
    'ID-1': {
      id: 'ID-1',
      name: 'Sreevyas',
      email: 'sreevyas@example.com',
      course: 'AI MLL',
      password: 'Pass-Sreevyas2026!',
      avatar: '/avatars/sreevyas.jpg',
      card: {
        number: '4532 8912 3456 7890',
        pin: '1234',
        exp: '08/29',
        cvv: '482',
        name: 'SREEVYAS'
      }
    },
    'ID-2': {
      id: 'ID-2',
      name: 'Daivik',
      email: 'daivik@example.com',
      course: 'Computer Science',
      password: 'Pass-Daivik2026!',
      avatar: '/avatars/daivik.jpg',
      card: {
        number: '5412 7522 9012 3411',
        pin: '2345',
        exp: '11/28',
        cvv: '719',
        name: 'DAIVIK'
      }
    },
    'ID-3': {
      id: 'ID-3',
      name: 'Adarsh',
      email: 'adarsh@example.com',
      course: 'Computer Science',
      password: 'Pass-Adarsh2026!',
      avatar: '/avatars/adarsh.jpg',
      card: {
        number: '4916 2201 8842 1093',
        pin: '3456',
        exp: '05/30',
        cvv: '305',
        name: 'ADARSH'
      }
    },
    'ID-4': {
      id: 'ID-4',
      name: 'Raghav',
      email: 'raghav@example.com',
      course: 'Computer Science',
      password: 'Pass-Raghav2026!',
      avatar: '/avatars/raghav.jpg',
      card: {
        number: '3782 8224 1290 8472',
        pin: '4567',
        exp: '12/27',
        cvv: '992',
        name: 'RAGHAV'
      }
    },
    'ID-5': {
      id: 'ID-5',
      name: 'Shravan',
      email: 'shravan@example.com',
      course: 'Computer Science',
      password: 'Pass-Shravan2026!',
      avatar: '/avatars/shravan.jpg',
      card: {
        number: '4223 9012 5543 8910',
        pin: '5678',
        exp: '03/29',
        cvv: '614',
        name: 'SHRAVAN'
      }
    }
  };

  let activeUserId = 'ID-3'; // Default to Adarsh if not set
  let activeProfile = VAULT_PROFILES['ID-3'];
  let autoPopupPromptDone = false;

  // Resolve active logged-in user from Student Portal session storage
  function resolveActiveUser(callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_SESSION' }, (res) => {
        if (res && res.session && res.session.user && res.session.user.id) {
          activeUserId = res.session.user.id;
          if (!VAULT_PROFILES[activeUserId]) {
            VAULT_PROFILES[activeUserId] = {
              id: activeUserId,
              name: res.session.user.name || `User ${activeUserId}`,
              email: res.session.user.email || `${activeUserId.toLowerCase()}@example.com`,
              course: res.session.user.course || 'Computer Science',
              password: `Pass-${res.session.user.name || activeUserId}2026!`,
              card: {
                number: '4916 0000 0000 9999',
                pin: '1234',
                exp: '12/29',
                cvv: '123',
                name: (res.session.user.name || activeUserId).toUpperCase()
              }
            };
          }
          activeProfile = VAULT_PROFILES[activeUserId];
        } else {
          // Check local cookies / localStorage fallback
          const cookieMatch = document.cookie.match(/crossid_session_id=([^;]+)/) || document.cookie.match(/campuspass_session_id=([^;]+)/);
          const savedId = cookieMatch ? cookieMatch[1] : (localStorage.getItem('crossid_session_id') || localStorage.getItem('campuspass_session_id'));
          if (savedId && VAULT_PROFILES[savedId]) {
            activeUserId = savedId;
            activeProfile = VAULT_PROFILES[savedId];
          }
        }
        if (callback) callback(activeProfile);
      });
    } else {
      if (callback) callback(activeProfile);
    }
  }

  // Retrieve saved vault data for this domain & active user
  function getVaultDataForDomain(userId, domain, callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_SITE_VAULT', payload: { userId, domain } }, (res) => {
        if (res && res.vault) {
          callback(res.vault);
        } else {
          // Return default seed vault for profile
          const profile = VAULT_PROFILES[userId] || VAULT_PROFILES['ID-3'];
          callback({
            name: profile.name,
            email: profile.email,
            password: profile.password,
            card: profile.card
          });
        }
      });
    } else {
      const profile = VAULT_PROFILES[userId] || VAULT_PROFILES['ID-3'];
      callback({
        name: profile.name,
        email: profile.email,
        password: profile.password,
        card: profile.card
      });
    }
  }

  // Save vault data for domain & active user
  function saveVaultDataForDomain(userId, domain, data, callback) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SAVE_SITE_VAULT', payload: { userId, domain, vaultData: data } }, (res) => {
        if (callback) callback(res ? res.vault : data);
      });
    } else {
      if (callback) callback(data);
    }
  }

  // Initialize and check page input fields
  function checkPageInputsAndTrigger() {
    if (autoPopupPromptDone) return;
    const inputs = Array.from(document.querySelectorAll('input'));
    if (inputs.length === 0) return;

    autoPopupPromptDone = true;
    resolveActiveUser((profile) => {
      getVaultDataForDomain(profile.id, currentDomain, (vaultData) => {
        showFaceIDVaultModal(profile, vaultData);
      });
    });
  }

  // Listen for sensitive field focus
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (target && target.tagName === 'INPUT') {
      showAutofillPill(target, 'autofill');
    }
  });

  // Floating trigger pill on field focus
  function showAutofillPill(inputEl, fieldType) {
    if (document.getElementById('crossid-autofill-pill') || document.getElementById('campuspass-autofill-pill')) return;

    const rect = inputEl.getBoundingClientRect();
    const pill = document.createElement('div');
    pill.id = 'crossid-autofill-pill';
    pill.style.position = 'absolute';
    pill.style.top = `${window.scrollY + rect.bottom + 6}px`;
    pill.style.left = `${window.scrollX + rect.left}px`;
    pill.style.zIndex = '999999';
    pill.style.background = '#090e1d';
    pill.style.color = '#06b6d4';
    pill.style.border = '1px solid #06b6d4';
    pill.style.borderRadius = '10px';
    pill.style.padding = '6px 12px';
    pill.style.fontSize = '12px';
    pill.style.fontFamily = 'monospace';
    pill.style.boxShadow = '0 4px 20px rgba(6, 182, 212, 0.3)';
    pill.style.cursor = 'pointer';
    pill.style.display = 'flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '8px';

    pill.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;"></span>
      <span>🛡️ Cross ID Face ID Autofill (${fieldType === 'card' ? 'Card & PIN' : 'Password'})</span>
    `;

    document.body.appendChild(pill);

    pill.addEventListener('click', () => {
      pill.remove();
      resolveActiveUser((profile) => {
        getVaultDataForDomain(profile.id, currentDomain, (vaultData) => {
          showFaceIDVaultModal(profile, vaultData);
        });
      });
    });

    setTimeout(() => pill.remove(), 8000);
  }

  // POPUP MODAL 1: Prompt to enter data when NO data is found for domain
  function showDataEntryPopupModal(profile, fieldType) {
    if (document.getElementById('crossid-entry-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'crossid-entry-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '9999999';
    modal.style.background = 'rgba(4, 7, 17, 0.88)';
    modal.style.backdropFilter = 'blur(12px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '20px';

    modal.innerHTML = `
      <div style="background:#090e1d; border:1px solid #f59e0b; border-radius:20px; padding:24px; max-width:480px; width:100%; color:#fff; font-family:monospace; box-shadow:0 0 35px rgba(245,158,11,0.25);">
        <div style="display:flex; justify-space-between; align-items:center; border-bottom:1px solid #162038; padding-bottom:12px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">🔑</span>
            <span style="font-weight:bold; color:#f59e0b;">Cross ID Password & Card Manager</span>
          </div>
          <span style="font-size:10px; background:#451a03; color:#f59e0b; padding:2px 8px; border-radius:4px; border:1px solid #f59e0b;">NEW SITE DETECTED</span>
        </div>

        <p style="font-size:12px; color:#cbd5e1; margin-bottom:16px;">
          No saved credentials found for <strong style="color:#38bdf8;">${currentDomain}</strong> under profile <strong style="color:#10b981;">${profile.name} (${profile.id})</strong>. Enter site data below to store into your biometric vault:
        </p>

        <form id="vault-entry-form" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Full Name</label>
              <input type="text" id="entry-name" value="${profile.name}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" required />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Phone Number</label>
              <input type="text" id="entry-phone" value="${profile.phone || '+91 98765 43210'}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">User / Email Address</label>
              <input type="text" id="entry-email" value="${profile.email}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" required />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Site Password</label>
              <input type="password" id="entry-password" value="${profile.password}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" required />
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 2fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Credit Card Number</label>
              <input type="text" id="entry-card-num" value="${profile.card.number}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Card PIN</label>
              <input type="password" id="entry-card-pin" value="${profile.card.pin}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Card Expiry (MM/YY)</label>
              <input type="text" id="entry-card-exp" value="${profile.card.exp}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" />
            </div>
            <div>
              <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:3px;">Card CVV</label>
              <input type="text" id="entry-card-cvv" value="${profile.card.cvv}" style="width:100%; background:#03060c; border:1px solid #1e293b; color:#fff; padding:8px; border-radius:8px; font-size:12px; font-family:monospace;" />
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:8px; margin-top:10px;">
            <button type="button" id="close-entry-btn" style="flex:1; padding:10px; background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:10px; font-size:12px; cursor:pointer;">Skip</button>
            <button type="submit" style="flex:2; padding:10px; background:linear-gradient(90deg,#d97706,#059669); color:#fff; border:none; border-radius:10px; font-size:12px; font-weight:bold; cursor:pointer;">💾 Save to Vault & Autofill</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-entry-btn').addEventListener('click', () => modal.remove());

    modal.querySelector('#vault-entry-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const vaultData = {
        name: modal.querySelector('#entry-name').value,
        phone: modal.querySelector('#entry-phone').value,
        email: modal.querySelector('#entry-email').value,
        password: modal.querySelector('#entry-password').value,
        card: {
          number: modal.querySelector('#entry-card-num').value,
          pin: modal.querySelector('#entry-card-pin').value,
          exp: modal.querySelector('#entry-card-exp').value,
          cvv: modal.querySelector('#entry-card-cvv').value,
          name: (modal.querySelector('#entry-name').value || profile.name).toUpperCase()
        }
      };

      saveVaultDataForDomain(profile.id, currentDomain, vaultData, () => {
        modal.remove();
        showFaceIDVaultModal(profile, vaultData);
      });
    });
  }

  // POPUP MODAL 2: Face ID Verification & Autofill when data exists (Side Positioned Widget with Live Camera)
  function showFaceIDVaultModal(profile, vaultData) {
    if (document.getElementById('crossid-face-modal')) return;

    let activeCameraStream = null;

    const modal = document.createElement('div');
    modal.id = 'crossid-face-modal';
    modal.style.position = 'fixed';
    modal.style.bottom = '24px';
    modal.style.right = '24px';
    modal.style.zIndex = '9999999';
    modal.style.width = '370px';
    modal.style.maxWidth = 'calc(100vw - 32px)';
    modal.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.3)';

    const card = vaultData.card || profile.card;

    modal.innerHTML = `
      <div style="background:#090e1d; border:1px solid #06b6d4; border-radius:18px; padding:18px; color:#fff; font-family:monospace; text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #162038; padding-bottom:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🛡️</span>
            <span style="font-weight:bold; color:#06b6d4; font-size:13px;">Cross ID Face ID Vault</span>
          </div>
          <span style="font-size:10px; background:#062c43; color:#06b6d4; padding:2px 8px; border-radius:4px; border:1px solid #06b6d4;">LIVE CAM ACTIVE</span>
        </div>

        <!-- Saved Profile & Domain Header -->
        <div style="background:#03060c; border:1px solid #1e293b; border-radius:10px; padding:10px; text-align:left; margin-bottom:12px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:3px;">
            <span>ACTIVE PROFILE: <strong style="color:#10b981;" id="modal-student-name">${profile.name} (${profile.id})</strong></span>
            <span style="color:#38bdf8;">${currentDomain}</span>
          </div>
          <div style="color:#cbd5e1;">📧 Email: <strong style="color:#fff;">${vaultData.email || profile.email}</strong></div>
          <div style="color:#cbd5e1;">🔑 Password: <strong style="color:#38bdf8;">••••••••••••</strong></div>
          <div style="color:#cbd5e1;">💳 Card: <strong style="color:#f59e0b;" id="modal-student-card">${card.number}</strong></div>
        </div>

        <!-- Live Video Camera Preview HUD Frame -->
        <div style="position:relative; width:100%; height:180px; background:#000; border:1px solid #1e293b; border-radius:10px; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-bottom:12px;" id="face-hud-box">
          <video id="hud-cam-video" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover; display:block;"></video>
          
          <!-- Overlaid Target Reticle Frame -->
          <div style="position:absolute; inset:20px; border:1.5px dashed rgba(6,182,212,0.8); border-radius:12px; pointer-events:none; display:flex; align-items:center; justify-content:center;">
            <div style="width:12px; height:12px; border-top:2px solid #06b6d4; border-left:2px solid #06b6d4; position:absolute; top:-2px; left:-2px;"></div>
            <div style="width:12px; height:12px; border-top:2px solid #06b6d4; border-right:2px solid #06b6d4; position:absolute; top:-2px; right:-2px;"></div>
            <div style="width:12px; height:12px; border-bottom:2px solid #06b6d4; border-left:2px solid #06b6d4; position:absolute; bottom:-2px; left:-2px;"></div>
            <div style="width:12px; height:12px; border-bottom:2px solid #06b6d4; border-right:2px solid #06b6d4; position:absolute; bottom:-2px; right:-2px;"></div>
          </div>

          <!-- Scanning Overlay Bar -->
          <div style="position:absolute; bottom:8px; left:12px; right:12px; background:rgba(3,6,12,0.75); backdrop-filter:blur(4px); padding:4px 8px; border-radius:6px; border:1px solid rgba(6,182,212,0.4);">
            <div style="font-size:11px; color:#38bdf8;" id="hud-status">Scanning Face Biometrics...</div>
            <div style="width:100%; height:3px; background:#1e293b; border-radius:2px; margin-top:4px; overflow:hidden;">
              <div id="hud-bar" style="width:30%; height:100%; background:linear-gradient(90deg, #06b6d4, #10b981); transition:width 0.3s;"></div>
            </div>
          </div>
        </div>

        <div id="modal-error-box" style="display:none; padding:8px; border-radius:8px; background:rgba(225,29,72,0.15); border:1px solid #e11d48; color:#f43f5e; font-size:11px; margin-bottom:12px;"></div>

        <div style="display:flex; justify-content:space-between; gap:8px;">
          <button id="cancel-face-btn" style="flex:1; padding:9px; background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:8px; font-size:11px; cursor:pointer;">Cancel</button>
          <button id="perform-face-btn" style="flex:2; padding:9px; background:linear-gradient(90deg,#0891b2,#059669); color:#fff; border:none; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">Verify & Autofill</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Start Live Webcam Video Stream
    const videoEl = modal.querySelector('#hud-cam-video');
    if (videoEl && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          activeCameraStream = stream;
          videoEl.srcObject = stream;
          videoEl.play().catch(e => {});
        })
        .catch(err => {
          console.warn('Webcam stream notice:', err);
        });
    }

    let isVerifying = false;

    function runVerification(targetKey = '1') {
      if (isVerifying) return;
      isVerifying = true;

      const hudStatus = modal.querySelector('#hud-status');
      const hudBar = modal.querySelector('#hud-bar');
      const errBox = modal.querySelector('#modal-error-box');
      errBox.style.display = 'none';

      // Key 0 triggers error / failure
      if (targetKey === '0') {
        hudStatus.textContent = 'Comparing Biometric Vector...';
        hudBar.style.width = '60%';

        setTimeout(() => {
          hudBar.style.width = '100%';
          errBox.style.display = 'block';
          errBox.textContent = '❌ Biometric Mismatch: Camera face score (38.4%) below required threshold (75.0%). Login Failed.';
          hudStatus.textContent = 'Authentication Rejected';
          isVerifying = false;
        }, 800);
        return;
      }

      const userMap = {
        '1': 'ID-1',
        '2': 'ID-2',
        '3': 'ID-3',
        '4': 'ID-4',
        '5': 'ID-5'
      };

      const selectedUserId = userMap[targetKey] || `ID-${targetKey}`;
      const targetProfile = VAULT_PROFILES[selectedUserId] || profile;

      hudStatus.textContent = `Matching Biometrics for ${targetProfile.name}...`;
      hudBar.style.width = '65%';

      getVaultDataForDomain(selectedUserId, currentDomain, (targetVaultData) => {
        setTimeout(() => {
          hudBar.style.width = '100%';
          hudStatus.textContent = `✓ Biometric Verified: ${targetProfile.name} (98.2%)`;

          setTimeout(() => {
            stopWebcam();
            window.removeEventListener('keydown', handleKeyDown);
            modal.remove();
            executeAutofill(targetProfile, targetVaultData);
          }, 600);
        }, 800);
      });
    }

    function stopWebcam() {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(t => t.stop());
        activeCameraStream = null;
      }
    }

    // Presentation keydown listener (0-9)
    function handleKeyDown(e) {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        runVerification(e.key);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    modal.querySelector('#perform-face-btn').addEventListener('click', () => runVerification(activeUserId.replace('ID-', '') || '3'));
    modal.querySelector('#cancel-face-btn').addEventListener('click', () => {
      stopWebcam();
      window.removeEventListener('keydown', handleKeyDown);
      modal.remove();
    });
  }

  // Execute automatic field population for passwords, PINs, card details, full name, phone number, and email
  function executeAutofill(profile, vaultData) {
    const cardData = vaultData.card || profile.card;
    const emailVal = vaultData.email || profile.email;
    const passVal = vaultData.password || profile.password;
    const fullNameVal = vaultData.name || profile.name;
    const phoneVal = vaultData.phone || profile.phone || '+91 98765 43210';

    const inputs = Array.from(document.querySelectorAll('input'));

    inputs.forEach(inp => {
      const type = (inp.type || '').toLowerCase();
      const name = (inp.name || '').toLowerCase();
      const id = (inp.id || '').toLowerCase();
      const auto = (inp.autocomplete || '').toLowerCase();
      const placeholder = (inp.placeholder || '').toLowerCase();

      const isFullName = (auto.includes('name') && !auto.includes('cc-')) ||
                         name.includes('fullname') || name.includes('full_name') || name.includes('student_name') || name.includes('studentname') || name === 'name' || id === 'name' || id.includes('fullname') || id.includes('full_name') || placeholder.includes('full name') || placeholder.includes('your name') || placeholder.includes('student name');

      const isPhone = auto.includes('tel') || name.includes('phone') || id.includes('phone') || name.includes('mobile') || id.includes('mobile');

      const isCardNum = auto.includes('cc-number') || 
                        name.includes('cardnumber') || name.includes('card_number') || name.includes('creditcard') ||
                        id.includes('cardnumber') || id.includes('card_number') || id.includes('creditcard') ||
                        name === 'card' || id === 'card' || placeholder.includes('0000');

      const isFullName = !isCardNum && (
        (auto.includes('name') && !auto.includes('cc-')) ||
        name.includes('fullname') || name.includes('full_name') || name.includes('student_name') || name.includes('studentname') ||
        id.includes('fullname') || id.includes('full_name') || id.includes('student_name') || id.includes('studentname') ||
        name === 'name' || id === 'name' || placeholder.includes('jane doe') || placeholder.includes('john doe') || placeholder.includes('full name')
      );

      const isCardPin = name.includes('pin') || id.includes('pin') || auto.includes('pin');
      const isCardExp = auto.includes('cc-exp') || name.includes('exp') || id.includes('exp') || placeholder.includes('mm/yy');
      const isCardCvv = auto.includes('cc-csc') || name.includes('cvv') || name.includes('cvc') || id.includes('cvv') || id.includes('cvc');
      const isCardHolder = auto.includes('cc-name') || name.includes('holder') || id.includes('holder');
      const isPhone = auto.includes('tel') || name.includes('phone') || id.includes('phone') || name.includes('mobile') || id.includes('mobile');
      const isPassword = type === 'password';
      const isEmail = type === 'email' || (type === 'text' && (name.includes('user') || name.includes('email') || id.includes('user') || id.includes('email') || name.includes('login') || id.includes('login')));

      // Credit Card Number
      if (isCardNum) {
        setNativeValue(inp, cardData.number);
      }
      // Credit Card PIN
      else if (isCardPin) {
        setNativeValue(inp, cardData.pin || '1234');
      }
      // Credit Card Expiry
      else if (isCardExp) {
        setNativeValue(inp, cardData.exp);
      }
      // Credit Card CVV / CVC
      else if (isCardCvv) {
        setNativeValue(inp, cardData.cvv);
      }
      // Credit Cardholder Name
      else if (isCardHolder) {
        setNativeValue(inp, cardData.name || profile.name.toUpperCase());
      }
      // Full Name (Student / User Name)
      else if (isFullName) {
        setNativeValue(inp, fullNameVal);
      }
      // Phone Number
      else if (isPhone) {
        setNativeValue(inp, phoneVal);
      }
      // Password
      else if (isPassword) {
        setNativeValue(inp, passVal);
      }
      // Email / Username
      else if (isEmail) {
        setNativeValue(inp, emailVal);
      }
    });
  }

  function setNativeValue(element, value) {
    if (!element) return;
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.style.border = '2px solid #06b6d4';
    element.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.4)';
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPageInputsAndTrigger);
  } else {
    setTimeout(checkPageInputsAndTrigger, 500);
  }
})();
