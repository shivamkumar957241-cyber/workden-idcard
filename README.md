# WORKDEN – Professional ID Card Management & QR Verification Portal

Official enterprise-grade ID Card Management and live QR Verification System for **WorkDen Unified Spaces**.

---

## 🌟 Key Features & Updates

1. **Real Login-Based Authentication (JWT + Bcrypt)**
   - No mock/fake role switchers.
   - Separate, role-protected interfaces for **Admin** (`/admin`) and **Users** (`/dashboard`).
   - Secure token-based session handling with automatic expiry and renewal.

2. **Self-Service User ID Application Workflow**
   - Users register their own account (`/register`).
   - Fill out the ID Card application form with profile photo, personal, and membership details.
   - Track application review timeline in real-time (`Submitted` ➔ `Under Review` ➔ `Approved / Rejected`).
   - Each user can **only** see and download their own ID card.

3. **Admin Verification & Approval Control Centre**
   - Review pending user & staff applications.
   - One-click approval automatically generates a sequential ID (`WD-EMP-2026-XXXXX` or `WD-USER-2026-XXXXX`), cryptographic QR verification token, and active ID card record.
   - Reject with custom remarks.

4. **Public QR Code Verification (`workden.online/verify/:token`)**
   - Opens directly via **Google Lens**, phone camera, or standard QR scanner with **no login required**.
   - Server-side live status calculation (`ACTIVE & VALID`, `EXPIRED`, `SUSPENDED`, `REVOKED`, `INVALID ID`).
   - Zero exposure of private data (mobile number, residential address, DOB are hidden).
   - Live scan tracking counter.

5. **CR80 Standard ID Card Design & PDF Export**
   - Standard ISO CR80 ID dimensions (85.60 × 53.98 mm).
   - High-resolution front & back printable design with crisp typography, QR code, and security pattern.
   - Vector-accurate PDF generation & instant print layout.

6. **Image Upload Fixed & Netlify Ready**
   - High-resolution photo upload with Base64 fallback (works seamlessly on serverless / Netlify / ephemeral hosts).
   - Frontend is 100% Netlify ready with `netlify.toml` and `client/public/_redirects`.

---

## 🔐 Default Admin Account

- **Email:** `admin@workden.online`
- **Password:** `WorkDen@2026`
- **Role:** Administrator (`ADMIN`)

---

## 🚀 Running Locally

### 1. Start Backend Server (Port 5000)
```bash
node server/server.js
```
The server will start at `http://localhost:5000`.

### 2. Start Frontend Dev Server (Port 3000)
```bash
cd client
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run Automated E2E Verification Tests
```bash
node test_phase2.js
```

---

## 🌐 Deployment Guide

### Deploying Frontend to Netlify
1. Connect your repository to Netlify.
2. In Netlify Build Settings:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. In Netlify Environment Variables:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://workden-api.onrender.com`)
   - `VITE_VERIFY_BASE_URL`: `https://workden.online`
4. The `_redirects` file in `client/public` ensures SPA client routing works cleanly across all paths.

### Deploying Backend to Render / Railway
1. Choose Web Service with Node.js runtime.
2. **Build command:** `npm install`
3. **Start command:** `node server/server.js`
4. Add Environment Variables:
   - `PORT`: `5000`
   - `JWT_SECRET`: Your production secret key
   - `CORS_ORIGIN`: Your Netlify URL (or `*`)
