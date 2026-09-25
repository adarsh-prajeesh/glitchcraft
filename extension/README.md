# CampusPass Single Sign-On (SSO) Chrome Extension

A production-grade **Google Chrome Extension (Manifest V3)** that captures verified Multi-Factor Authentication (MFA) sessions from the **CampusPass / AegisGuard** gateway and automatically signs students into college partner portals, LMS, digital libraries, and university services without re-entering credentials each time.

---

## 🚀 How to Install in Google Chrome

1. Open **Google Chrome** on your computer.
2. In the URL address bar, navigate to:
   ```
   chrome://extensions
   ```
3. In the top-right corner of the Extensions page, enable **Developer mode** (toggle switch).
4. In the top-left corner, click **Load unpacked**.
5. Browse to and select the `extension` folder located inside this project:
   ```
   c:\Users\Sreevyas\glitchcraft\extension
   ```
6. The **CampusPass SSO - Multi-Factor Auto-Sign-In** extension will appear in your extensions list.
7. Click the **Extensions puzzle icon** in your Chrome toolbar and **pin** CampusPass for easy access!

---

## 🧪 Testing the End-to-End SSO Auto-Login

### Step 1: Authenticate on the CampusPass MFA Gateway
1. Ensure your local dev server is running (`npm run dev`).
2. Open the login portal at [http://localhost:5173](http://localhost:5173).
3. Complete **Step 1 (Face ID Biometric Scan)** by looking into the camera or choosing a test student profile.
4. Complete **Step 2 (ID Card Barcode Scan)** by scanning the matching badge or selecting the assigned barcode payload.
5. Once authenticated, the portal automatically synchronizes your session to the Chrome Extension!

### Step 2: Inspect the Chrome Extension Popup
1. Click the **CampusPass SSO icon** in your Chrome toolbar.
2. Notice the green **SSO Active** badge!
3. The popup displays:
   - Student portrait & full name
   - Institutional college email (`@college.edu.in`)
   - Course & Age
   - ID Card Barcode Payload (with one-click copy)
   - Auto-Submit form toggle

### Step 3: Experience Instant Auto-Sign-In on Partner Sites
1. In the extension popup, click **"Test Auto-Login (Library Portal)"** (or navigate to any partner site).
2. The extension automatically:
   - Detects the login form and field types.
   - Displays the floating **CampusPass SSO** verification card in the top-right corner.
   - Fills the student's email/ID and physical barcode passkey into the appropriate inputs.
   - Automatically submits the form after a smooth visual confirmation!
3. You are immediately granted access to the digital repository without typing a single character!

---

## ⚙️ Extension Architecture

- **`manifest.json`**: Manifest V3 compliant configuration with scoped storage and active permissions.
- **`background.js`**: Background service worker managing 8-hour session state in `chrome.storage.local` and dynamic toolbar badges.
- **`portal-content.js`**: Content script running on the gateway to securely bridge MFA authentication events.
- **`partner-content.js`**: Universal heuristic content script detecting login inputs on foreign pages and populating credentials with native change dispatchers.
- **`popup.html / popup.js / popup.css`**: Cyber-themed status dashboard and configuration panel.
- **`test-partner-site/`**: Ready-to-run mock university research library demonstrating cross-site automated sign-in.
