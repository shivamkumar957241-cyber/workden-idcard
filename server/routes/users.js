const express = require('express');
const router = express.Router();
const { db, generateUserIdCode, generateSecureToken, logAudit, updateExpiredCards } = require('../db');

// GET /api/users - List all User ID profiles
router.get('/', (req, res) => {
  try {
    updateExpiredCards();
    const { search, plan, category, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT 
        u.*,
        c.id as card_id,
        c.card_number,
        c.issue_date,
        c.expiry_date,
        c.validity_period,
        c.status as card_status,
        c.authorized_by,
        c.card_version,
        c.approved_by,
        c.approved_at,
        q.token as qr_token,
        q.is_active as qr_active,
        q.scan_count
      FROM user_id_profiles u
      LEFT JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      LEFT JOIN qr_verification_tokens q ON q.card_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.user_id_code LIKE ? OR u.workden_user_id LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (plan && plan !== 'ALL') {
      query += ` AND u.current_plan = ?`;
      params.push(plan);
    }

    if (category && category !== 'ALL') {
      query += ` AND u.user_category = ?`;
      params.push(category);
    }

    if (status && status !== 'ALL') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).count;

    query += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

    const userList = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: userList,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/search - Search existing WorkDen users by query (ID, mobile, name, email)
router.get('/search', (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.json({ success: true, data: [] });
    }

    const term = `%${query.trim()}%`;
    const results = db.prepare(`
      SELECT u.*, c.status as card_status, c.card_number
      FROM user_id_profiles u
      LEFT JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      WHERE u.workden_user_id LIKE ? OR u.mobile LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.user_id_code LIKE ?
      LIMIT 10
    `).all(term, term, term, term, term);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error searching existing users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id - Single User ID detail
router.get('/:id', (req, res) => {
  try {
    updateExpiredCards();
    const user = db.prepare(`
      SELECT 
        u.*,
        c.id as card_id,
        c.card_number,
        c.issue_date,
        c.expiry_date,
        c.validity_period,
        c.status as card_status,
        c.authorized_by,
        c.card_version,
        c.remarks,
        c.approved_by,
        c.approved_at,
        q.token as qr_token,
        q.is_active as qr_active,
        q.scan_count,
        q.last_scanned_at
      FROM user_id_profiles u
      LEFT JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      LEFT JOIN qr_verification_tokens q ON q.card_id = c.id
      WHERE u.id = ? OR u.user_id_code = ?
    `).get(req.params.id, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found' });
    }

    const history = user.card_id ? db.prepare(`
      SELECT * FROM id_card_history WHERE card_id = ? ORDER BY id DESC
    `).all(user.card_id) : [];

    res.json({
      success: true,
      data: {
        ...user,
        history
      }
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users - Create / Issue New User ID Card
router.post('/', (req, res) => {
  try {
    const {
      full_name,
      photo_url,
      mobile,
      email,
      workden_user_id,
      registration_date,
      current_plan = 'Dedicated Desk',
      user_category = 'Coworking Member',
      user_status = 'Active',
      validity_period = '1 Year',
      issue_date,
      expiry_date,
      authorized_by = 'Membership Director',
      remarks = '',
      auto_approve = false
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full Name is required' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile Number is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email Address is required' });
    }

    // Check duplicate check for existing user ID profile
    if (workden_user_id) {
      const existing = db.prepare('SELECT id, user_id_code FROM user_id_profiles WHERE workden_user_id = ?').get(workden_user_id.trim());
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `An ID card record already exists for WorkDen User ID ${workden_user_id} (${existing.user_id_code}). Please edit or renew instead.`
        });
      }
    }

    const cardIssueDate = issue_date || new Date().toISOString().split('T')[0];
    let cardExpiryDate = expiry_date;
    if (!cardExpiryDate) {
      const d = new Date(cardIssueDate);
      const years = validity_period.includes('2') ? 2 : validity_period.includes('3') ? 3 : 1;
      d.setFullYear(d.getFullYear() + years);
      cardExpiryDate = d.toISOString().split('T')[0];
    }

    const cardStatus = auto_approve ? 'ACTIVE' : 'PENDING';

    const insertTx = db.transaction(() => {
      // 1. Generate sequential User ID: WD-USER-YYYY-00001
      const userIdCode = generateUserIdCode();

      // 2. Insert into user_id_profiles
      const profileStmt = db.prepare(`
        INSERT INTO user_id_profiles (
          user_id_code, workden_user_id, full_name, photo_url, mobile, email,
          registration_date, current_plan, user_category, user_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const profileRes = profileStmt.run(
        userIdCode,
        workden_user_id ? workden_user_id.trim() : null,
        full_name.trim(),
        photo_url || null,
        mobile.trim(),
        email.trim().toLowerCase(),
        registration_date || cardIssueDate,
        current_plan,
        user_category,
        user_status
      );

      const profileId = profileRes.lastInsertRowid;
      const cardNumber = `CRD-USR-${userIdCode}`;

      // 3. Insert ID Card Record
      const cardStmt = db.prepare(`
        INSERT INTO id_card_records (
          card_number, profile_type, profile_id, entity_code, issue_date, expiry_date,
          validity_period, status, authorized_by, remarks, card_version, created_by,
          approved_by, approved_at
        ) VALUES (?, 'USER', ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Admin', ?, ?)
      `);

      const cardRes = cardStmt.run(
        cardNumber,
        profileId,
        userIdCode,
        cardIssueDate,
        cardExpiryDate,
        validity_period,
        cardStatus,
        authorized_by,
        remarks,
        auto_approve ? 'Admin Director' : null,
        auto_approve ? new Date().toISOString() : null
      );

      const cardId = cardRes.lastInsertRowid;

      // 4. Generate unique secure verification token
      const token = generateSecureToken();
      db.prepare(`
        INSERT INTO qr_verification_tokens (card_id, token, is_active)
        VALUES (?, ?, ?)
      `).run(cardId, token, cardStatus === 'ACTIVE' ? 1 : 0);

      // 5. Add History Record
      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'CREATED', ?, 'Admin')
      `).run(cardId, `User ID Card ${userIdCode} generated in ${cardStatus} status.`);

      // 6. Audit Log
      logAudit('CREATE_USER_ID', 'Admin', 'USER', userIdCode, {
        user_id_code: userIdCode,
        full_name,
        current_plan,
        user_category,
        status: cardStatus
      });

      return { profileId, userIdCode, cardId, token, cardStatus };
    });

    const result = insertTx();

    res.status(201).json({
      success: true,
      message: `User ID Card ${result.userIdCode} created successfully (${result.cardStatus})`,
      data: result
    });
  } catch (err) {
    console.error('Error creating user ID:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/approve - Approve Pending User ID Card
router.post('/:id/approve', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, c.id as card_id
      FROM user_id_profiles u
      JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      WHERE u.id = ? OR u.user_id_code = ?
    `).get(req.params.id, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found' });
    }

    const approveTx = db.transaction(() => {
      db.prepare(`
        UPDATE id_card_records
        SET status = 'ACTIVE', approved_by = 'Membership Director', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(user.card_id);

      db.prepare(`
        UPDATE qr_verification_tokens
        SET is_active = 1
        WHERE card_id = ?
      `).run(user.card_id);

      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'APPROVED', 'User ID approved and activated', 'Admin')
      `).run(user.card_id);

      logAudit('APPROVE_USER_ID', 'Admin', 'USER', user.user_id_code, `Approved ID for ${user.full_name}`);
    });

    approveTx();

    res.json({
      success: true,
      message: `User ID Card ${user.user_id_code} approved and activated!`
    });
  } catch (err) {
    console.error('Error approving user ID:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/status - Status change
router.post('/:id/status', (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const user = db.prepare(`
      SELECT u.*, c.id as card_id, c.status as current_status
      FROM user_id_profiles u
      JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      WHERE u.id = ? OR u.user_id_code = ?
    `).get(req.params.id, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found' });
    }

    const statusTx = db.transaction(() => {
      db.prepare(`
        UPDATE id_card_records
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, user.card_id);

      if (status === 'REVOKED') {
        db.prepare(`
          UPDATE qr_verification_tokens
          SET is_active = 0
          WHERE card_id = ?
        `).run(user.card_id);
      } else if (status === 'ACTIVE') {
        db.prepare(`
          UPDATE qr_verification_tokens
          SET is_active = 1
          WHERE card_id = ?
        `).run(user.card_id);
      }

      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, ?, ?, 'Admin')
      `).run(user.card_id, status, `Status changed from ${user.current_status} to ${status}. Reason: ${reason || 'Admin action'}`);

      logAudit(`STATUS_CHANGE_${status}`, 'Admin', 'USER', user.user_id_code, `User ID status changed to ${status}`);
    });

    statusTx();

    res.json({ success: true, message: `User ID ${user.user_id_code} status updated to ${status}` });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/users/:id/renew - Renew
router.post('/:id/renew', (req, res) => {
  try {
    const { years = 1, remarks } = req.body;
    const user = db.prepare(`
      SELECT u.*, c.id as card_id, c.expiry_date
      FROM user_id_profiles u
      JOIN id_card_records c ON c.profile_type = 'USER' AND c.profile_id = u.id
      WHERE u.id = ? OR u.user_id_code = ?
    `).get(req.params.id, req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User record not found' });
    }

    const baseDate = new Date(user.expiry_date) > new Date() ? new Date(user.expiry_date) : new Date();
    baseDate.setFullYear(baseDate.getFullYear() + parseInt(years, 10));
    const newExpiryDate = baseDate.toISOString().split('T')[0];

    const renewTx = db.transaction(() => {
      db.prepare(`
        UPDATE id_card_records
        SET expiry_date = ?, status = 'ACTIVE', validity_period = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newExpiryDate, `${years} Year${years > 1 ? 's' : ''}`, user.card_id);

      db.prepare(`
        UPDATE qr_verification_tokens
        SET is_active = 1
        WHERE card_id = ?
      `).run(user.card_id);

      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'RENEWED', ?, 'Admin')
      `).run(user.card_id, `User ID Card renewed for ${years} year(s). New expiry date: ${newExpiryDate}. Note: ${remarks || 'Standard Renewal'}`);

      logAudit('RENEW_USER_ID', 'Admin', 'USER', user.user_id_code, `Renewed until ${newExpiryDate}`);
    });

    renewTx();

    res.json({ success: true, message: `User ID Card renewed until ${newExpiryDate}`, new_expiry_date: newExpiryDate });
  } catch (err) {
    console.error('Error renewing user card:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/users/:id - Permanently purge user profile & all associated records from database
router.delete('/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const userProfile = db.prepare('SELECT * FROM user_id_profiles WHERE id = ?').get(userId);
    if (!userProfile) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    db.transaction(() => {
      const cards = db.prepare("SELECT id FROM id_card_records WHERE profile_type = 'USER' AND profile_id = ?").all(userId);
      for (const c of cards) {
        db.prepare('DELETE FROM qr_verification_tokens WHERE card_id = ?').run(c.id);
        db.prepare('DELETE FROM id_card_history WHERE card_id = ?').run(c.id);
        db.prepare('DELETE FROM id_applications WHERE card_id = ?').run(c.id);
      }
      db.prepare("DELETE FROM id_card_records WHERE profile_type = 'USER' AND profile_id = ?").run(userId);
      db.prepare("DELETE FROM id_applications WHERE application_type = 'USER' AND (email = ? OR mobile = ? OR profile_id = ?)").run(userProfile.email, userProfile.mobile, userId);
      db.prepare('DELETE FROM user_id_profiles WHERE id = ?').run(userId);
      db.prepare("DELETE FROM auth_users WHERE email = ? AND role != 'ADMIN'").run(userProfile.email);
      logAudit('USER_DELETED', req.user?.email || 'Admin', 'USER', userId, `Permanently purged user ${userProfile.full_name} (${userProfile.user_id_code}) from database`, req.ip);
    })();

    res.json({ success: true, message: `User ${userProfile.full_name} permanently purged from database.` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
