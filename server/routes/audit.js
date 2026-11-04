const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/audit-logs - Audit trail
router.get('/', (req, res) => {
  try {
    const { action, limit = 100 } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const params = [];

    if (action) {
      query += ' WHERE action LIKE ?';
      params.push(`%${action}%`);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
