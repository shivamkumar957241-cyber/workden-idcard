const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'workden_super_secret_jwt_key_2026_do_not_share';

/**
 * Middleware: Require valid JWT token.
 * Attaches req.user = { id, email, role, full_name, profile_id }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user still exists in database (prevents foreign key errors from stale sessions)
    const user = db.prepare('SELECT id, email, role, full_name, profile_id FROM auth_users WHERE id = ? AND is_active = 1').get(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User session invalid or user no longer exists. Please sign in or register.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }
}

/**
 * Middleware: Require ADMIN role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

/**
 * Generate a JWT token for a user payload.
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, requireAdmin, signToken, JWT_SECRET };
