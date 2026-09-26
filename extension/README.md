# Cross ID Single Sign-On (SSO) Chrome Extension

A production-grade **Google Chrome Extension (Manifest V3)** that captures verified Multi-Factor Authentication (MFA) sessions from the **Cross ID** gateway and automatically signs students into college partner portals, LMS, digital libraries, voter portals, and university services without re-entering credentials each time.

---

## 🚀 How to Install in Google Chrome

1. Open **Google Chrome** on your computer.
2. In the URL address bar, navigate to:
   ```
   chrome://extensions
   ```
3. In the top-right corner of the Extensions page, enable **Developer mode** (toggle switch).
4. In the top-left corner, click **Load unpacked**.
5. Browse to and select the `extension` folder located inside this project directory.
6. The **Cross ID - Multi-Factor Auto-Sign-In** extension will appear in your extensions list.
7. Click the **Extensions puzzle icon** in your Chrome toolbar and **pin** Cross ID for easy access!

---

## 🧪 Testing the End-to-End SSO Auto-Login

### Step 1: Authenticate on the Cross ID MFA Gateway
1. Ensure your local dev server is running (`npm run dev`).
2. Open the login portal at [http://localhost:5173](http://localhost:5173).
3. Complete **Biometric Facial Scan & Video Challenge** by looking into the camera or choosing a test student profile.
4. Once authenticated, the portal automatically synchronizes your session to the Chrome Extension!

### Step 2: Inspect the Chrome Extension Popup
1. Click the **Cross ID icon** in your Chrome toolbar.
2. Notice the green **SSO Active** badge!
3. The popup displays:
   - Student portrait & full name
   - Institutional email
   - Verified Credentials / Claims
   - One-click access to partner sites

### Step 3: Experience Instant Auto-Sign-In on Partner Sites
1. In the extension popup, click **"Test Trusted Partner Site"** (or navigate to any partner site like `/library`, `/voter`, etc.).
2. The extension automatically:
   - Detects the login form and field types.
   - Displays the floating **Cross ID SSO** verification card.
   - Fills the user's credentials into the appropriate inputs.
   - Automatically submits the form after a smooth visual confirmation!
3. You are immediately granted access without typing a single character!

---

## ⚙️ Extension Architecture

- **`manifest.json`**: Manifest V3 compliant configuration with scoped storage and active permissions.
- **`background.js`**: Background service worker managing session state in `chrome.storage.local` and dynamic toolbar badges.
- **`portal-content.js`**: Content script running on the gateway to securely bridge MFA authentication events.
- **`partner-content.js`**: Universal heuristic content script detecting login inputs on foreign pages and populating credentials with native change dispatchers.
- **`popup.html / popup.js / popup.css`**: Cyber-themed status dashboard and configuration panel.
- **`test-partner-site/`**: Ready-to-run mock university research library demonstrating cross-site automated sign-in.
