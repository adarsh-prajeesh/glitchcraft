/**
 * CampusPass SSO Assistant - Partner Site Auto-Sign-In Content Script
 * Detects login forms on partner websites and automatically populates & submits
 * verified student credentials using the active CampusPass MFA session.
 */

(function () {
  // Prevent executing on the CampusPass MFA portal root itself
  const isAuthPortal = (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port === '5173' &&
    !window.location.pathname.includes('/test-partner-site') &&
    (window.location.pathname === '/' || window.location.pathname.startsWith('/admin'))
  );

  if (isAuthPortal) {
    return;
  }

  // Request active session from background service worker
  chrome.runtime.sendMessage({ type: 'GET_AUTH_SESSION' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.active || !response.session) {
      return; // No active session
    }

    const { session, settings } = response;
    const user = session.user;

    // Wait until DOM is ready or inputs exist
    initAutoLogin(user, session, settings);
  });

  function initAutoLogin(user, session, settings) {
    const checkInterval = setInterval(() => {
      const candidates = findLoginFields();
      if (candidates.username || candidates.password) {
        clearInterval(checkInterval);
        handleFoundFields(candidates, user, session, settings);
      }
    }, 400);

    // Timeout searching after 12 seconds
    setTimeout(() => clearInterval(checkInterval), 12000);
  }

  // Intelligent heuristic to detect login fields on any webpage
  function findLoginFields() {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])'));
    
    let usernameField = null;
    let passwordField = null;
    let barcodeField = null;
    let submitBtn = null;
    let form = null;

    for (const input of inputs) {
      const name = (input.name || '').toLowerCase();
      const id = (input.id || '').toLowerCase();
      const placeholder = (input.placeholder || '').toLowerCase();
      const type = (input.type || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();

      const descriptor = `${name} ${id} ${placeholder} ${aria}`;

      // Password / Secret field
      if (type === 'password') {
        passwordField = passwordField || input;
      }

      // Barcode / Physical credential field
      if (descriptor.includes('barcode') || descriptor.includes('badge') || descriptor.includes('card_id') || descriptor.includes('rfid')) {
        barcodeField = barcodeField || input;
      }

      // Username / Student ID / Email field
      if (
        type === 'email' ||
        descriptor.includes('email') ||
        descriptor.includes('user') ||
        descriptor.includes('student') ||
        descriptor.includes('login') ||
        descriptor.includes('enroll') ||
        descriptor.includes('roll') ||
        descriptor.includes('matric') ||
        descriptor.includes('account')
      ) {
        usernameField = usernameField || input;
      }
    }

    // Fallback: If only 1 text input and 1 password input exist on page
    if (!usernameField && inputs.length > 0) {
      const textInputs = inputs.filter(i => i.type === 'text' || i.type === 'email' || !i.type);
      if (textInputs.length === 1) {
        usernameField = textInputs[0];
      }
    }

    // Find submit button or enclosing form
    const primaryInput = usernameField || passwordField || barcodeField;
    if (primaryInput) {
      form = primaryInput.closest('form');
      if (form) {
        submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');
      }
      if (!submitBtn) {
        submitBtn = document.querySelector('button[type="submit"], input[type="submit"], .btn-login, #login-button, #btn-submit');
      }
    }

    return {
      username: usernameField,
      password: passwordField,
      barcode: barcodeField,
      submit: submitBtn,
      form: form
    };
  }

  // Trigger proper React/Vue/vanilla input change events
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
    element.classList.add('campuspass-highlight-field');
  }

  function handleFoundFields(fields, user, session, settings) {
    const autoSubmit = settings.autoSubmit ?? true;
    const barcodePayload = user.barcode_payload || user.barcodePayload || `COL-${user.name.substring(0,3).toUpperCase()}-2026`;
    const email = user.email || `${user.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@college.edu.in`;

    // Render floating SSO toast
    renderFloatingBanner(user, autoSubmit, () => {
      performFillAndSubmit(fields, email, barcodePayload, true);
    });

    if (autoSubmit) {
      // Auto-fill and auto-submit after short delay
      setTimeout(() => {
        performFillAndSubmit(fields, email, barcodePayload, true);
      }, settings.autoFillDelayMs || 700);
    } else {
      // Just fill, let user review or submit manually
      performFillAndSubmit(fields, email, barcodePayload, false);
    }
  }

  function performFillAndSubmit(fields, email, barcodePayload, shouldSubmit) {
    if (fields.username) {
      setNativeValue(fields.username, email);
    }

    if (fields.barcode) {
      setNativeValue(fields.barcode, barcodePayload);
    }

    if (fields.password) {
      // If password field exists, use barcode credential payload as the trusted passkey
      setNativeValue(fields.password, barcodePayload);
    }

    if (shouldSubmit) {
      setTimeout(() => {
        if (fields.submit) {
          fields.submit.click();
        } else if (fields.form) {
          fields.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          if (typeof fields.form.submit === 'function') {
            fields.form.submit();
          }
        }
      }, 500);
    }
  }

  // Floating Cyber Pill Toast in Top-Right
  function renderFloatingBanner(user, autoSubmit, onManualSubmit) {
    if (document.getElementById('campuspass-sso-toast-root')) return;

    const root = document.createElement('div');
    root.id = 'campuspass-sso-toast-root';

    const avatarUrl = user.avatar_url || user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

    root.innerHTML = `
      <div class="campuspass-sso-card">
        <div class="campuspass-avatar-wrap">
          <img src="${avatarUrl}" alt="${user.name}" class="campuspass-avatar" />
          <div class="campuspass-badge-pill"></div>
        </div>
        <div class="campuspass-content">
          <div class="campuspass-header-line">
            <span class="campuspass-tag">CampusPass SSO</span>
            <span class="campuspass-status-text">${autoSubmit ? '⚡ Auto-Signing In...' : '✓ Verified'}</span>
          </div>
          <div class="campuspass-user-name">${user.name}</div>
          <div class="campuspass-user-sub">${user.course || 'Student'} • @college.edu.in</div>
        </div>
        <div class="campuspass-actions">
          ${!autoSubmit ? `<button class="campuspass-btn-signin" id="campuspass-instant-btn">Sign In</button>` : ''}
          <button class="campuspass-btn-dismiss" id="campuspass-dismiss-btn">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const instantBtn = root.querySelector('#campuspass-instant-btn');
    if (instantBtn) {
      instantBtn.addEventListener('click', () => {
        instantBtn.textContent = 'Signing in...';
        onManualSubmit();
      });
    }

    const dismissBtn = root.querySelector('#campuspass-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        root.remove();
      });
    }

    // Auto-remove toast after 7s if not clicked
    setTimeout(() => {
      if (root.parentElement) {
        root.style.opacity = '0';
        root.style.transform = 'translateY(-10px)';
        setTimeout(() => root.remove(), 400);
      }
    }, 7000);
  }
})();
