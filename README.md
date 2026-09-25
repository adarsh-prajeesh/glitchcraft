# AegisGuard Multi-Factor Authentication (MFA) System

A production-grade, sequential multi-factor authentication (MFA) system and user dashboard featuring **Server-Side Camera Face ID Biometrics** and **Optical ID Card Barcode Verification**.

Access is granted **ONLY** when both credentials (Facial Embedding + Physical ID Barcode Payload) match the **exact same registered personnel** in the backend database.

---

## 🛡️ Security Architecture & Pipeline

```
           [ Web Camera Stream ]
                     │
                     ▼
  ┌───────────────────────────────────────┐
  │  Step 1: Face ID Camera Scan          │
  │  • Video frame capture                │
  │  • Client transmits JPEG payload      │
  │  • Server extracts 128-d vector       │
  │  • Cosine Similarity threshold ≥ 75%  │
  └──────────────────┬────────────────────┘
                     │ Returns signed Step 1 Token
                     ▼
  ┌───────────────────────────────────────┐
  │  Step 2: ID Card Barcode Scan         │
  │  • Camera optical scanner / reader    │
  │  • Scans Code 128 / QR on ID back     │
  │  • Server verifies credential binding │
  │    (Barcode must match verified Face) │
  └──────────────────┬────────────────────┘
                     │ Both credentials match exact same user
                     ▼
  ┌───────────────────────────────────────┐
  │  Authenticated Session & Dashboard    │
  │  • Signed 8-Hour Session JWT          │
  │  • Audit Trail entry with latency/IP  │
  │  • Clearance Level & Profile metrics  │
  └───────────────────────────────────────┘
```

### Mathematical Biometric Cosine Similarity:
Biometric vectors $A$ and $B$ in $\mathbb{R}^{128}$ are compared using the normalized inner product:

$$\text{Sim}(A, B) = \frac{A \cdot B}{\|A\|_2 \|B\|_2} = \frac{\sum_{i=1}^{128} A_i B_i}{\sqrt{\sum_{i=1}^{128} A_i^2} \sqrt{\sum_{i=1}^{128} B_i^2}}$$

- **Threshold**: $\ge 0.75$ (configurable in `.env`)
- **Zero Raw Image Exposure**: Biometrics are stored in SQLite as JSON-serialized 128-dimensional floating point vectors, never raw unencrypted face photos.

---

## ⚡ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, `html5-qrcode` optical barcode scanner, Web Audio API cyber sound synthesizer.
- **Backend**: Node.js, Express, `jsonwebtoken`, `better-sqlite3` (WAL mode enabled).
- **Database**: SQLite (`backend/aegis_mfa.db`) storing:
  - `users`: Enrolled personnel, 128-d vectors, barcode payloads, clearance levels (1 to 5).
  - `audit_logs`: Live chronological security trail (IP, User Agent, Latency, Step Result).
  - `auth_sessions`: Sequential multi-factor session state machine with step expiration.

---

## 🚀 Quickstart & Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)

### 2. Environment Variables
Create a `.env` file in the root directory (or use `.env.example`):
```bash
PORT=3001
JWT_SECRET=aegis-mfa-quantum-classified-secret-key-2026
BIOMETRIC_THRESHOLD=0.75
```

### 3. Install Dependencies & Run
```bash
# Install dependencies
npm install

# Start both backend and frontend concurrently
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🧑‍💻 Pre-Seeded Enrolled Test Profiles

| Name | Role | Clearance | Barcode Payload |
| :--- | :--- | :---: | :--- |
| **Dr. Elena Vance** | Chief Biometric Scientist | Level 5 | `AUTH-VANCE-8801-L5` |
| **Major Alex Mercer** | Director of Infrastructure | Level 4 | `AUTH-MERCER-8802-L4` |
| **Sarah Connor** | Operations Security Architect | Level 5 | `AUTH-CONNOR-8803-L5` |

---

## 🧪 Testing Scenarios

### Scenario A: Successful 2-Factor Authentication
1. Open [http://localhost:5173](http://localhost:5173).
2. **Step 1 (Face ID)**:
   - Allow camera access, or click **Dr. Elena Vance** under *Test Profile Selector*.
   - Click **Capture Face & Verify on Server**.
   - Confirmation banner appears: `SERVER-SIDE IDENTITY MATCHED (97%)`.
3. **Step 2 (Barcode Scan)**:
   - Point your camera at the scannable badge or click **Matching ID Card (`AUTH-VANCE-8801-L5`)**.
   - Application verifies both steps match Dr. Elena Vance and unlocks the **Secured Dashboard**!

### Scenario B: Credential Mismatch Protection (Intrusion Attempt)
1. Complete Step 1 with **Dr. Elena Vance**.
2. On Step 2, click **Wrong Subject's Card (`AUTH-MERCER-8802-L4`)**.
3. System rejects with HTTP 403:
   `Barcode Credential Mismatch: Scanned ID card belongs to Major Alex Mercer, not verified facial subject Dr. Elena Vance`.
4. Check the **Security Audit Trail** to see the rejected intrusion attempt logged with timestamp and IP.

### Scenario C: Admin Personnel Enrollment
1. Click **Admin Enrollment** in the top navigation bar.
2. Fill out employee details (Name, Email, Role, Clearance Level).
3. Click **Open Camera** -> **Snap Biometric Frame** to extract face embedding.
4. Auto-generate or assign an ID barcode.
5. Submit to enroll the new user directly into the defense directory.

### Scenario D: Printable Physical Badges
1. Click **ID Badges** in the top navigation bar.
2. Toggle between **Card Front** (Photo, Security Badge, Hologram) and **Card Back** (High-Resolution Scannable Code 128 Barcode).
3. Point your camera at the on-screen badge or print it out!

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Subsystem status & version check |
| `GET` | `/api/users` | List enrolled defense personnel |
| `POST` | `/api/auth/step1-face` | Server-side facial recognition & token issue |
| `POST` | `/api/auth/step2-barcode` | Physical barcode verification & JWT session creation |
| `POST` | `/api/auth/register` | Admin enrollment of new personnel |
| `GET` | `/api/user/profile` | Authenticated profile (requires Bearer JWT) |
| `POST` | `/api/user/update-face` | Re-index facial biometric template |
| `GET` | `/api/audit-logs` | Live security audit logs & authentication stats |
