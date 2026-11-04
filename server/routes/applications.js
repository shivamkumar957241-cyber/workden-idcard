const express = require('express');
const router = express.Router();
const { db, generateStaffId, generateUserIdCode, generateSecureToken, logAudit } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/applications - Submit a new ID card application
router.post('/', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      application_type, full_name, photo_url, mobile, email,
      designation, department, residential_address, father_name,
      dob, gender, joining_date, employment_type, work_location,
      user_category, current_plan, remarks
    } = req.body;

    if (!full_name || !mobile || !email) {
      return res.status(400).json({ success: false, error: 'Full name, mobile and email are required.' });
    }

    // Check if user already has a pending or approved application
    const existing = db.prepare(`
      SELECT id, status FROM id_applications 
      WHERE applicant_user_id = ? AND status IN ('PENDING', 'APPROVED')
    `).get(userId);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: existing.status === 'APPROVED'
          ? 'You already have an approved ID card.'
          : 'You already have a pending application under review.'
      });
    }

    const appType = application_type || 'USER';

    const result = db.prepare(`
      INSERT INTO id_applications (
        applicant_user_id, application_type, full_name, photo_url, mobile, email,
        designation, department, residential_address, father_name, dob, gender,
        joining_date, employment_type, work_location, user_category, current_plan, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, appType, full_name.trim(), photo_url || null, mobile.trim(), email.trim(),
      designation || null, department || null, residential_address || null,
      father_name || null, dob || null, gender || null,
      joining_date || null, employment_type || null, work_location || null,
      user_category || 'WorkDen Member', current_plan || '₹499 – Full Access', remarks || null
    );

    logAudit('APPLICATION_SUBMIT', req.user.email, 'APPLICATION', result.lastInsertRowid,
      `ID card application submitted by ${req.user.email}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Your ID card application has been submitted successfully. It is now under review.',
      application_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Application submit error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error while submitting application.' });
  }
});

// GET /api/applications/my - Get logged-in user's own application(s)
router.get('/my', requireAuth, (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT a.*, 
        CASE 
          WHEN a.status = 'APPROVED' THEN (
            SELECT q.token FROM id_card_records c 
            JOIN qr_verification_tokens q ON q.card_id = c.id
            WHERE c.id = a.card_id AND q.is_active = 1
            LIMIT 1
          )
          ELSE NULL
        END as qr_token,
        CASE 
          WHEN a.status = 'APPROVED' THEN (
            SELECT c.expiry_date FROM id_card_records c 
            WHERE c.id = a.card_id LIMIT 1
          )
          ELSE NULL
        END as expiry_date,
        CASE 
          WHEN a.status = 'APPROVED' THEN (
            SELECT c.issue_date FROM id_card_records c 
            WHERE c.id = a.card_id LIMIT 1
          )
          ELSE NULL
        END as issue_date,
        CASE 
          WHEN a.status = 'APPROVED' THEN (
            SELECT c.status FROM id_card_records c 
            WHERE c.id = a.card_id LIMIT 1
          )
          ELSE NULL
        END as card_status,
        CASE 
          WHEN a.status = 'APPROVED' THEN (
            SELECT c.entity_code FROM id_card_records c 
            WHERE c.id = a.card_id LIMIT 1
          )
          ELSE NULL
        END as id_number
      FROM id_applications a
      WHERE a.applicant_user_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, data: apps });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET /api/applications - Admin: List all applications with filters
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT a.*, u.email as applicant_email
      FROM id_applications a
      JOIN auth_users u ON u.id = a.applicant_user_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (a.full_name LIKE ? OR a.email LIKE ? OR a.mobile LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params).count;
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const apps = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: apps,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('List applications error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// POST /api/applications/:id/approve - Admin approves an application
router.post('/:id/approve', requireAuth, requireAdmin, (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { validity_period, expiry_date, remarks } = req.body;

    const app = db.prepare('SELECT * FROM id_applications WHERE id = ?').get(appId);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (app.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Application is not in PENDING status.' });

    const today = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    const expiryDateFinal = expiry_date || defaultExpiry.toISOString().split('T')[0];

    let profileId, entityCode, cardNumber, profileType;

    if (app.application_type === 'STAFF') {
      // Create staff profile
      const staffId = generateStaffId();
      const staffRes = db.prepare(`
        INSERT INTO staff_profiles (
          staff_id, full_name, father_name, dob, gender, photo_url, mobile, email,
          residential_address, designation, department, joining_date, employment_type,
          work_location, employment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
      `).run(
        staffId, app.full_name, app.father_name, app.dob, app.gender, app.photo_url,
        app.mobile, app.email, app.residential_address, app.designation || 'Staff',
        app.department || 'General', app.joining_date || today,
        app.employment_type || 'Full-time', app.work_location || null
      );
      profileId = staffRes.lastInsertRowid;
      entityCode = staffId;
      cardNumber = `CRD-STF-${staffId}`;
      profileType = 'STAFF';

      // Link auth user to this staff profile
      db.prepare('UPDATE auth_users SET profile_id = ?, profile_type = ?, role = ? WHERE id = ?')
        .run(profileId, 'STAFF', 'STAFF', app.applicant_user_id);
    } else {
      // Create user ID profile
      const userIdCode = generateUserIdCode();
      const userRes = db.prepare(`
        INSERT INTO user_id_profiles (
          user_id_code, full_name, photo_url, mobile, email,
          registration_date, current_plan, user_category, user_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
      `).run(
        userIdCode, app.full_name, app.photo_url, app.mobile, app.email,
        today, app.current_plan || 'Hot Desk', app.user_category || 'Coworking Member'
      );
      profileId = userRes.lastInsertRowid;
      entityCode = userIdCode;
      cardNumber = `CRD-USR-${userIdCode}`;
      profileType = 'USER';

      // Link auth user to this user profile
      db.prepare('UPDATE auth_users SET profile_id = ?, profile_type = ? WHERE id = ?')
        .run(profileId, 'USER', app.applicant_user_id);
    }

    // Create ID Card Record
    const cardRes = db.prepare(`
      INSERT INTO id_card_records (
        card_number, profile_type, profile_id, entity_code, issue_date, expiry_date,
        validity_period, status, authorized_by, remarks, created_by, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Director of Operations', ?, 'Admin', ?, CURRENT_TIMESTAMP)
    `).run(
      cardNumber, profileType, profileId, entityCode, today, expiryDateFinal,
      validity_period || '1 Year', remarks || app.remarks, req.user.email
    );
    const cardId = cardRes.lastInsertRowid;

    // Create QR Token
    const token = generateSecureToken();
    db.prepare('INSERT INTO qr_verification_tokens (card_id, token, is_active) VALUES (?, ?, 1)').run(cardId, token);

    // Update application record
    db.prepare(`
      UPDATE id_applications 
      SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
          profile_id = ?, card_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.email, profileId, cardId, appId);

    // History
    db.prepare("INSERT INTO id_card_history (card_id, action, details, performed_by) VALUES (?, 'APPROVED', 'ID Card approved via application workflow', ?)").run(cardId, req.user.email);

    logAudit('APPLICATION_APPROVE', req.user.email, 'APPLICATION', appId,
      `Application approved. ${profileType} ID: ${entityCode}`, req.ip);

    res.json({
      success: true,
      message: `Application approved. ${profileType === 'STAFF' ? 'Staff' : 'User'} ID: ${entityCode} issued.`,
      entity_code: entityCode,
      card_id: cardId,
      qr_token: token
    });
  } catch (err) {
    console.error('Approve application error:', err);
    res.status(500).json({ success: false, error: 'Server error during approval: ' + err.message });
  }
});

// POST /api/applications/:id/reject - Admin rejects an application
router.post('/:id/reject', requireAuth, requireAdmin, (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { rejection_reason } = req.body;

    const app = db.prepare('SELECT id, status FROM id_applications WHERE id = ?').get(appId);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (app.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Application is not in PENDING status.' });

    db.prepare(`
      UPDATE id_applications 
      SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, 
          reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(rejection_reason || 'Does not meet requirements.', req.user.email, appId);

    logAudit('APPLICATION_REJECT', req.user.email, 'APPLICATION', appId, `Application rejected: ${rejection_reason}`, req.ip);

    res.json({ success: true, message: 'Application rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

module.exports = router;
