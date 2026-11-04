const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { updateExpiredCards } = require('./db');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Periodic check to auto-expire cards
setInterval(() => {
  try {
    updateExpiredCards();
  } catch (err) {
    console.error('Auto-expire check failed:', err);
  }
}, 60 * 60 * 1000); // Check hourly

// === PUBLIC API ROUTES ===
// Auth routes (login, register) - no auth required
app.use('/api/auth', require('./routes/auth'));

// QR Verification - fully public (accessible by anyone scanning a QR code)
app.use('/api/verify', require('./routes/verify'));
// Also expose at /verify/:token for the public URL pattern (redirect to frontend)
app.get('/verify/:token', (req, res) => {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.redirect(`/?verify=${req.params.token}`);
  }
});

// === PROTECTED API ROUTES ===
app.use('/api/upload', requireAuth, require('./routes/upload'));
app.use('/api/staff', requireAuth, require('./routes/staff'));
app.use('/api/users', requireAuth, require('./routes/users'));
app.use('/api/cards', requireAuth, require('./routes/cards'));
app.use('/api/settings', requireAuth, require('./routes/settings'));
app.use('/api/audit-logs', requireAuth, requireAdmin, require('./routes/audit'));
app.use('/api/applications', requireAuth, require('./routes/applications'));

// === SERVE CLIENT BUILD ===
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  // Catch-all SPA handler
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      message: 'WorkDen ID Card Management & QR Verification API Server is running.',
      frontend: 'Run: cd client && npm run dev'
    });
  });
}

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 WORKDEN ID CARD & QR VERIFICATION SYSTEM`);
  console.log(`📡 Backend Server: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login: admin@workden.online / WorkDen@2026`);
  console.log(`🔍 Verify API: http://localhost:${PORT}/api/verify/:token`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
