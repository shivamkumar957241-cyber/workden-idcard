const express = require('express');
const router = express.Router();
const { db, updateExpiredCards, logAudit } = require('../db');

// Helper to fetch unified card records
function getUnifiedCards(whereClause = '1=1', params = []) {
  updateExpiredCards();
  const query = `
    SELECT 
      c.id as card_id,
      c.card_number,
      c.profile_type,
      c.profile_id,
      c.entity_code,
      c.issue_date,
      c.expiry_date,
      c.validity_period,
      c.status,
      c.authorized_by,
      c.card_version,
      c.remarks,
      c.approved_by,
      c.approved_at,
      c.created_at,
      q.token as qr_token,
      q.is_active as qr_active,
      q.scan_count,
      q.last_scanned_at,
      -- Profile details (Staff or User)
      COALESCE(s.full_name, u.full_name) as full_name,
      COALESCE(s.photo_url, u.photo_url) as photo_url,
      COALESCE(s.email, u.email) as email,
      COALESCE(s.mobile, u.mobile) as mobile,
      s.designation,
      s.department,
      s.joining_date,
      u.workden_user_id,
      u.current_plan,
      u.user_category,
      u.registration_date
    FROM id_card_records c
    LEFT JOIN staff_profiles s ON c.profile_type = 'STAFF' AND c.profile_id = s.id
    LEFT JOIN user_id_profiles u ON c.profile_type = 'USER' AND c.profile_id = u.id
    LEFT JOIN qr_verification_tokens q ON q.card_id = c.id
    WHERE ${whereClause}
    ORDER BY c.id DESC
  `;
  return db.prepare(query).all(...params);
}

// GET /api/cards/all - All Issued ID Cards
router.get('/all', (req, res) => {
  try {
    const { search, type, status } = req.query;
    let where = '1=1';
    const params = [];

    if (search) {
      where += ` AND (
        c.entity_code LIKE ? OR 
        COALESCE(s.full_name, u.full_name) LIKE ? OR 
        COALESCE(s.email, u.email) LIKE ? OR 
        COALESCE(s.mobile, u.mobile) LIKE ?
      )`;
      const t = `%${search.trim()}%`;
      params.push(t, t, t, t);
    }

    if (type && type !== 'ALL') {
      where += ` AND c.profile_type = ?`;
      params.push(type);
    }

    if (status && status !== 'ALL') {
      where += ` AND c.status = ?`;
      params.push(status);
    }

    const cards = getUnifiedCards(where, params);
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error('Error fetching all cards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/pending - Pending ID Approvals
router.get('/pending', (req, res) => {
  try {
    const cards = getUnifiedCards("c.status = 'PENDING'");
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error('Error fetching pending cards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/expired - Expired ID Cards
router.get('/expired', (req, res) => {
  try {
    const cards = getUnifiedCards("c.status = 'EXPIRED'");
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error('Error fetching expired cards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/revoked - Suspended or Revoked ID Cards
router.get('/revoked', (req, res) => {
  try {
    const cards = getUnifiedCards("c.status IN ('SUSPENDED', 'REVOKED')");
    res.json({ success: true, data: cards });
  } catch (err) {
    console.error('Error fetching revoked cards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/qr-management - QR Verification Token Registry & Stats
router.get('/qr-management', (req, res) => {
  try {
    updateExpiredCards();
    const tokens = db.prepare(`
      SELECT 
        q.id as token_id,
        q.token,
        q.is_active,
        q.scan_count,
        q.last_scanned_at,
        q.created_at as token_created_at,
        c.id as card_id,
        c.card_number,
        c.profile_type,
        c.entity_code,
        c.status as card_status,
        c.expiry_date,
        COALESCE(s.full_name, u.full_name) as holder_name,
        COALESCE(s.photo_url, u.photo_url) as photo_url,
        COALESCE(s.designation, u.user_category) as role_title,
        COALESCE(s.department, u.current_plan) as sub_title
      FROM qr_verification_tokens q
      JOIN id_card_records c ON q.card_id = c.id
      LEFT JOIN staff_profiles s ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      LEFT JOIN user_id_profiles u ON c.profile_type = 'USER' AND c.profile_id = u.id
      ORDER BY q.id DESC
    `).all();

    const stats = {
      total_tokens: tokens.length,
      active_tokens: tokens.filter(t => t.is_active === 1 && t.card_status === 'ACTIVE').length,
      revoked_tokens: tokens.filter(t => t.is_active === 0 || t.card_status === 'REVOKED').length,
      total_scans: tokens.reduce((sum, t) => sum + (t.scan_count || 0), 0)
    };

    res.json({ success: true, data: tokens, stats });
  } catch (err) {
    console.error('Error fetching QR tokens:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cards/toggle-token/:id - Toggle QR token active state
router.post('/toggle-token/:id', (req, res) => {
  try {
    const tokenRecord = db.prepare('SELECT * FROM qr_verification_tokens WHERE id = ?').get(req.params.id);
    if (!tokenRecord) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }

    const newStatus = tokenRecord.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE qr_verification_tokens SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);

    logAudit('TOGGLE_QR_TOKEN', 'Admin', 'TOKEN', req.params.id, `Token state changed to ${newStatus === 1 ? 'Active' : 'Disabled'}`);

    res.json({
      success: true,
      message: `Token state set to ${newStatus === 1 ? 'Active' : 'Disabled'}`,
      is_active: newStatus
    });
  } catch (err) {
    console.error('Error toggling token:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/export - Export Cards CSV
router.get('/export', (req, res) => {
  try {
    const cards = getUnifiedCards('1=1');
    const headers = [
      'Card Number', 'Profile Type', 'Entity ID', 'Full Name', 'Designation / Plan',
      'Department / Category', 'Mobile', 'Email', 'Issue Date', 'Expiry Date',
      'Status', 'QR Token', 'Scan Count'
    ];

    const rows = cards.map(c => [
      `"${c.card_number || ''}"`,
      `"${c.profile_type || ''}"`,
      `"${c.entity_code || ''}"`,
      `"${c.full_name || ''}"`,
      `"${c.designation || c.current_plan || ''}"`,
      `"${c.department || c.user_category || ''}"`,
      `"${c.mobile || ''}"`,
      `"${c.email || ''}"`,
      `"${c.issue_date || ''}"`,
      `"${c.expiry_date || ''}"`,
      `"${c.status || ''}"`,
      `"${c.qr_token || ''}"`,
      c.scan_count || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="workden_id_cards_export.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting cards:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cards/:id/history - Card History
router.get('/:id/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM id_card_history WHERE card_id = ? ORDER BY id DESC').all(req.params.id);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('Error fetching card history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
