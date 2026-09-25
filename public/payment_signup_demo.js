document.addEventListener('DOMContentLoaded', () => {
  // Profiles DB for Standalone Presentation
  const DEMO_PROFILES = {
    '1': { id: 'ID-1', name: 'Sreevyas', course: 'AI MLL', age: 19, card: '4532 8912 3456 7890' },
    '2': { id: 'ID-2', name: 'Daivik', course: 'Computer Science', age: 18, card: '5412 7522 9012 3411' },
    '3': { id: 'ID-3', name: 'Adarsh', course: 'Computer Science', age: 17, card: '4916 2201 8842 1093' },
    '4': { id: 'ID-4', name: 'Raghav', course: 'Computer Science', age: 18, card: '3782 8224 1290 8472' },
    '5': { id: 'ID-5', name: 'Shravan', course: 'Computer Science', age: 18, card: '4223 9012 5543 8910' }
  };

  const nameInput = document.getElementById('fullName');
  const cardInput = document.getElementById('cardNumber');
  let currentProfile = DEMO_PROFILES['3']; // Default to Adarsh
  let activeCameraStream = null;

  // Card input mask handling
  if (cardInput) {
    cardInput.removeAttribute('pattern');
    cardInput.addEventListener('input', function (e) {
      let target = e.target;
      let position = target.selectionStart;
      let length = target.value.length;

      let value = target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      let matches = value.match(/\d{4,16}/g);
      let match = matches && matches[0] || '';
      let parts = [];

      for (let i = 0, len = match.length; i < len; i += 4) {
        parts.push(match.substring(i, i + 4));
      }

      if (parts.length > 0) {
        target.value = parts.join(' ');
      } else {
        target.value = value;
      }

      if (position !== length) {
        target.setSelectionRange(position, position);
      }
    });
  }

  // Floating trigger pill on focus
  function showAutofillPill(inputEl) {
    if (document.getElementById('campuspass-autofill-pill')) return;

    const rect = inputEl.getBoundingClientRect();
    const pill = document.createElement('div');
    pill.id = 'campuspass-autofill-pill';
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
      <span>🛡️ CampusPass Face ID Autofill</span>
    `;

    document.body.appendChild(pill);

    pill.addEventListener('click', () => {
      pill.remove();
      showFaceIDModal();
    });

    setTimeout(() => pill.remove(), 6000);
  }

  if (nameInput) nameInput.addEventListener('focus', () => showAutofillPill(nameInput));
  if (cardInput) cardInput.addEventListener('focus', () => showAutofillPill(cardInput));

  // Side Positioned Face ID Biometric HUD Modal with Live Webcam Stream
  function showFaceIDModal() {
    if (document.getElementById('campuspass-face-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'campuspass-face-modal';
    modal.style.position = 'fixed';
    modal.style.bottom = '24px';
    modal.style.right = '24px';
    modal.style.zIndex = '9999999';
    modal.style.width = '370px';
    modal.style.maxWidth = 'calc(100vw - 32px)';
    modal.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.3)';

    modal.innerHTML = `
      <div style="background:#090e1d; border:1px solid #06b6d4; border-radius:18px; padding:18px; color:#fff; font-family:monospace; text-align:center;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #162038; padding-bottom:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">🛡️</span>
            <span style="font-weight:bold; color:#06b6d4; font-size:13px;">CampusPass Face ID Vault</span>
          </div>
          <span style="font-size:10px; background:#062c43; color:#06b6d4; padding:2px 8px; border-radius:4px; border:1px solid #06b6d4;">LIVE CAM ACTIVE</span>
        </div>

        <!-- Student Profile Card -->
        <div style="background:#03060c; border:1px solid #1e293b; border-radius:10px; padding:10px; text-align:left; margin-bottom:12px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:3px;">
            <span>STUDENT: <strong style="color:#10b981;" id="modal-student-name">${currentProfile.name} (${currentProfile.id})</strong></span>
            <span style="color:#38bdf8;">${currentProfile.course}</span>
          </div>
          <div style="color:#cbd5e1;">💳 CARD: <strong style="color:#f59e0b;" id="modal-student-card">${currentProfile.card}</strong></div>
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
          console.warn('Webcam preview notice:', err);
        });
    }

    let isVerifying = false;

    function runVerification(key = '3') {
      if (isVerifying) return;
      isVerifying = true;

      const hudStatus = modal.querySelector('#hud-status');
      const hudBar = modal.querySelector('#hud-bar');
      const errBox = modal.querySelector('#modal-error-box');
      errBox.style.display = 'none';

      // Key 0 triggers error / failure
      if (key === '0') {
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

      const profile = DEMO_PROFILES[key] || currentProfile;
      modal.querySelector('#modal-student-name').textContent = `${profile.name} (${profile.id})`;
      modal.querySelector('#modal-student-card').textContent = profile.card;

      hudStatus.textContent = `Matching Biometrics for ${profile.name}...`;
      hudBar.style.width = '65%';

      setTimeout(() => {
        hudBar.style.width = '100%';
        hudStatus.textContent = `✓ Biometric Verified: ${profile.name} (98.4%)`;

        setTimeout(() => {
          stopWebcam();
          window.removeEventListener('keydown', handleKeyDown);
          modal.remove();
          autofillFields(profile);
        }, 600);
      }, 700);
    }

    function stopWebcam() {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(t => t.stop());
        activeCameraStream = null;
      }
    }

    function handleKeyDown(e) {
      if (['0', '1', '2', '3', '4', '5'].includes(e.key)) {
        runVerification(e.key);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    modal.querySelector('#perform-face-btn').addEventListener('click', () => runVerification('3'));
    modal.querySelector('#cancel-face-btn').addEventListener('click', () => {
      stopWebcam();
      window.removeEventListener('keydown', handleKeyDown);
      modal.remove();
    });
  }

  // Populate inputs with smooth animation and cyan glow
  function autofillFields(profile) {
    if (nameInput) {
      nameInput.value = profile.name;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      nameInput.style.borderColor = '#06b6d4';
      nameInput.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.4)';
    }

    if (cardInput) {
      cardInput.value = profile.card;
      cardInput.dispatchEvent(new Event('input', { bubbles: true }));
      cardInput.dispatchEvent(new Event('change', { bubbles: true }));
      cardInput.style.borderColor = '#06b6d4';
      cardInput.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.4)';
    }
  }

  // Form submit handling
  const form = document.getElementById('paymentForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = nameInput ? nameInput.value : '';
      const card = cardInput ? cardInput.value : '';
      alert(`[CampusPass Biometric Verification Passed]\n\nSuccessfully submitted registration:\n• Student Name: ${name}\n• Credit Card: **** **** **** ${card.slice(-4)}\n\nVerification Status: Verified via Face ID.`);
    });
  }

  // Auto-trigger side modal on page load after a slight delay
  setTimeout(showFaceIDModal, 600);
});
