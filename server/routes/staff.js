const express = require('express');
const router = express.Router();
const { db, generateStaffId, generateSecureToken, logAudit, updateExpiredCards } = require('../db');

// GET /api/staff - List staff profiles with search & filters
router.get('/', (req, res) => {
  try {
    updateExpiredCards();
    const { search, department, designation, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT 
        s.*,
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
      FROM staff_profiles s
      LEFT JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      LEFT JOIN qr_verification_tokens q ON q.card_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (s.full_name LIKE ? OR s.staff_id LIKE ? OR s.email LIKE ? OR s.mobile LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (department && department !== 'ALL') {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    if (designation && designation !== 'ALL') {
      query += ` AND s.designation = ?`;
      params.push(designation);
    }

    if (status && status !== 'ALL') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const totalCount = db.prepare(countQuery).get(...params).count;

    query += ` ORDER BY s.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

    const staffList = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: staffList,
      pagination: {
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    });
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/staff/:id - Single staff detail
router.get('/:id', (req, res) => {
  try {
    updateExpiredCards();
    const staff = db.prepare(`
      SELECT 
        s.*,
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
      FROM staff_profiles s
      LEFT JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      LEFT JOIN qr_verification_tokens q ON q.card_id = c.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(req.params.id, req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    // Get history
    const history = staff.card_id ? db.prepare(`
      SELECT * FROM id_card_history WHERE card_id = ? ORDER BY id DESC
    `).all(staff.card_id) : [];

    res.json({
      success: true,
      data: {
        ...staff,
        history
      }
    });
  } catch (err) {
    console.error('Error fetching staff member:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/staff - Register New Staff
router.post('/', (req, res) => {
  try {
    const {
      full_name,
      father_name,
      dob,
      gender,
      photo_url,
      mobile,
      email,
      residential_address,
      designation,
      department,
      joining_date,
      employment_type = 'Full-time',
      reporting_manager,
      reporting_manager_id,
      work_location = 'Headquarters - Noida',
      employment_status = 'Active',
      validity_period = '1 Year',
      issue_date,
      expiry_date,
      authorized_by = 'Director of Operations',
      remarks = '',
      auto_approve = false
    } = req.body;

    // Strict validation of required fields
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full Name is required' });
    }
    if (!photo_url) {
      return res.status(400).json({ success: false, error: 'Profile Photograph is required' });
    }
    if (!mobile || !mobile.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile Number is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email Address is required' });
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({ success: false, error: 'Designation is required' });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, error: 'Department is required' });
    }
    if (!joining_date) {
      return res.status(400).json({ success: false, error: 'Joining Date is required' });
    }

    // Calculate dates if not explicitly provided
    const cardIssueDate = issue_date || new Date().toISOString().split('T')[0];
    let cardExpiryDate = expiry_date;
    if (!cardExpiryDate) {
      const d = new Date(cardIssueDate);
      const years = validity_period.includes('2') ? 2 : validity_period.includes('3') ? 3 : 1;
      d.setFullYear(d.getFullYear() + years);
      cardExpiryDate = d.toISOString().split('T')[0];
    }

    const cardStatus = auto_approve ? 'ACTIVE' : 'PENDING';

    const insertTransaction = db.transaction(() => {
      // 1. Generate unique sequential Staff ID: WD-EMP-YYYY-00001
      const staffId = generateStaffId();

      // 2. Insert into staff_profiles
      const profileStmt = db.prepare(`
        INSERT INTO staff_profiles (
          staff_id, full_name, father_name, dob, gender, photo_url, mobile, email,
          residential_address, designation, department, joining_date, employment_type,
          reporting_manager, reporting_manager_id, work_location, employment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const profileRes = profileStmt.run(
        staffId,
        full_name.trim(),
        father_name ? father_name.trim() : null,
        dob || null,
        gender || 'Not Specified',
        photo_url,
        mobile.trim(),
        email.trim().toLowerCase(),
        residential_address ? residential_address.trim() : null,
        designation.trim(),
        department.trim(),
        joining_date,
        employment_type,
        reporting_manager ? reporting_manager.trim() : null,
        reporting_manager_id ? reporting_manager_id.trim() : null,
        work_location,
        employment_status
      );

      const profileId = profileRes.lastInsertRowid;
      const cardNumber = `CRD-STF-${staffId}`;

      // 3. Insert ID Card Record
      const cardStmt = db.prepare(`
        INSERT INTO id_card_records (
          card_number, profile_type, profile_id, entity_code, issue_date, expiry_date,
          validity_period, status, authorized_by, remarks, card_version, created_by,
          approved_by, approved_at
        ) VALUES (?, 'STAFF', ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Admin', ?, ?)
      `);

      const cardRes = cardStmt.run(
        cardNumber,
        profileId,
        staffId,
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
      `).run(cardId, `Staff ID ${staffId} registered in ${cardStatus} status.`);

      // 6. Audit Log
      logAudit('CREATE_STAFF_ID', 'Admin', 'STAFF', staffId, {
        staff_id: staffId,
        full_name,
        department,
        designation,
        status: cardStatus
      });

      return { profileId, staffId, cardId, token, cardStatus };
    });

    const result = insertTransaction();

    res.status(201).json({
      success: true,
      message: `Staff ID ${result.staffId} generated successfully (${result.cardStatus})`,
      data: result
    });
  } catch (err) {
    console.error('Error registering staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/staff/:id/approve - Approve Pending Staff ID Card
router.post('/:id/approve', (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = db.prepare(`
      SELECT s.*, c.id as card_id, c.status as card_status
      FROM staff_profiles s
      JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(staffId, staffId);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff record not found' });
    }

    const approveTx = db.transaction(() => {
      // Update card status to ACTIVE
      db.prepare(`
        UPDATE id_card_records 
        SET status = 'ACTIVE', approved_by = 'Admin Director', approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(staff.card_id);

      // Ensure QR token is active
      db.prepare(`
        UPDATE qr_verification_tokens
        SET is_active = 1
        WHERE card_id = ?
      `).run(staff.card_id);

      // Log history
      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'APPROVED', 'Staff ID approved by Admin and activated for digital & print verification', 'Admin')
      `).run(staff.card_id);

      // Audit log
      logAudit('APPROVE_STAFF_ID', 'Admin', 'STAFF', staff.staff_id, `Card approved and activated for ${staff.full_name}`);
    });

    approveTx();

    res.json({
      success: true,
      message: `Staff ID ${staff.staff_id} approved and officially activated!`
    });
  } catch (err) {
    console.error('Error approving staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/staff/:id - Update Staff Profile & Card Info (Corrections)
router.put('/:id', (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = db.prepare(`
      SELECT s.*, c.id as card_id
      FROM staff_profiles s
      LEFT JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(staffId, staffId);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff record not found' });
    }

    const {
      full_name, father_name, dob, gender, photo_url, mobile, email,
      residential_address, designation, department, joining_date,
      employment_type, reporting_manager, reporting_manager_id,
      work_location, employment_status, authorized_by, remarks
    } = req.body;

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE staff_profiles
        SET full_name = ?, father_name = ?, dob = ?, gender = ?, photo_url = ?,
            mobile = ?, email = ?, residential_address = ?, designation = ?,
            department = ?, joining_date = ?, employment_type = ?,
            reporting_manager = ?, reporting_manager_id = ?,
            work_location = ?, employment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        full_name || staff.full_name,
        father_name !== undefined ? father_name : staff.father_name,
        dob || staff.dob,
        gender || staff.gender,
        photo_url || staff.photo_url,
        mobile || staff.mobile,
        email || staff.email,
        residential_address !== undefined ? residential_address : staff.residential_address,
        designation || staff.designation,
        department || staff.department,
        joining_date || staff.joining_date,
        employment_type || staff.employment_type,
        reporting_manager || staff.reporting_manager,
        reporting_manager_id || staff.reporting_manager_id,
        work_location || staff.work_location,
        employment_status || staff.employment_status,
        staff.id
      );

      if (staff.card_id && (authorized_by || remarks !== undefined)) {
        db.prepare(`
          UPDATE id_card_records
          SET authorized_by = COALESCE(?, authorized_by),
              remarks = COALESCE(?, remarks),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(authorized_by || null, remarks !== undefined ? remarks : null, staff.card_id);
      }

      if (staff.card_id) {
        db.prepare(`
          INSERT INTO id_card_history (card_id, action, details, performed_by)
          VALUES (?, 'CORRECTED', 'Staff details updated / corrected by Admin', 'Admin')
        `).run(staff.card_id);
      }

      logAudit('UPDATE_STAFF', 'Admin', 'STAFF', staff.staff_id, 'Staff profile and card info updated');
    });

    updateTx();

    res.json({ success: true, message: 'Staff details updated successfully' });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/staff/:id/status - Change Status (ACTIVE, SUSPENDED, REVOKED)
router.post('/:id/status', (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const staff = db.prepare(`
      SELECT s.*, c.id as card_id, c.status as current_status
      FROM staff_profiles s
      JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(req.params.id, req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff record not found' });
    }

    const statusTx = db.transaction(() => {
      // Update card status
      db.prepare(`
        UPDATE id_card_records
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, staff.card_id);

      // If revoked, deactivate QR token
      if (status === 'REVOKED') {
        db.prepare(`
          UPDATE qr_verification_tokens
          SET is_active = 0
          WHERE card_id = ?
        `).run(staff.card_id);
      } else if (status === 'ACTIVE') {
        db.prepare(`
          UPDATE qr_verification_tokens
          SET is_active = 1
          WHERE card_id = ?
        `).run(staff.card_id);
      }

      // Record in history
      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, ?, ?, 'Admin')
      `).run(staff.card_id, status, `Status changed from ${staff.current_status} to ${status}. Reason: ${reason || 'Admin action'}`);

      logAudit(`STATUS_CHANGE_${status}`, 'Admin', 'STAFF', staff.staff_id, `Status updated to ${status}. Reason: ${reason || 'N/A'}`);
    });

    statusTx();

    res.json({
      success: true,
      message: `Staff ID ${staff.staff_id} status updated to ${status}`
    });
  } catch (err) {
    console.error('Error changing status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/staff/:id/renew - Renew ID Card
router.post('/:id/renew', (req, res) => {
  try {
    const { years = 1, remarks } = req.body;
    const staff = db.prepare(`
      SELECT s.*, c.id as card_id, c.expiry_date, c.status as current_status
      FROM staff_profiles s
      JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(req.params.id, req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff record not found' });
    }

    // Calculate new expiry date based on today or existing expiry if in future
    const baseDate = new Date(staff.expiry_date) > new Date() ? new Date(staff.expiry_date) : new Date();
    baseDate.setFullYear(baseDate.getFullYear() + parseInt(years, 10));
    const newExpiryDate = baseDate.toISOString().split('T')[0];

    const renewTx = db.transaction(() => {
      db.prepare(`
        UPDATE id_card_records
        SET expiry_date = ?, status = 'ACTIVE', validity_period = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newExpiryDate, `${years} Year${years > 1 ? 's' : ''}`, staff.card_id);

      db.prepare(`
        UPDATE qr_verification_tokens
        SET is_active = 1
        WHERE card_id = ?
      `).run(staff.card_id);

      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'RENEWED', ?, 'Admin')
      `).run(staff.card_id, `ID Card renewed for ${years} year(s). New expiry date: ${newExpiryDate}. Note: ${remarks || 'Standard Renewal'}`);

      logAudit('RENEW_STAFF_ID', 'Admin', 'STAFF', staff.staff_id, `Renewed until ${newExpiryDate}`);
    });

    renewTx();

    res.json({
      success: true,
      message: `ID Card renewed successfully until ${newExpiryDate}`,
      new_expiry_date: newExpiryDate
    });
  } catch (err) {
    console.error('Error renewing staff ID:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/staff/:id/replace - Generate Replacement ID Card (invalidates old QR token)
router.post('/:id/replace', (req, res) => {
  try {
    const { reason = 'Card Lost / Damaged' } = req.body;
    const staff = db.prepare(`
      SELECT s.*, c.id as card_id, c.card_version
      FROM staff_profiles s
      JOIN id_card_records c ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      WHERE s.id = ? OR s.staff_id = ?
    `).get(req.params.id, req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff record not found' });
    }

    const newToken = generateSecureToken();
    const newVersion = (staff.card_version || 1) + 1;

    const replaceTx = db.transaction(() => {
      // Invalidate old QR tokens
      db.prepare(`
        UPDATE qr_verification_tokens
        SET is_active = 0
        WHERE card_id = ?
      `).run(staff.card_id);

      // Insert new active QR token
      db.prepare(`
        INSERT INTO qr_verification_tokens (card_id, token, is_active)
        VALUES (?, ?, 1)
      `).run(staff.card_id, newToken);

      // Increment card version
      db.prepare(`
        UPDATE id_card_records
        SET card_version = ?, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newVersion, staff.card_id);

      // Log in history
      db.prepare(`
        INSERT INTO id_card_history (card_id, action, details, performed_by)
        VALUES (?, 'REPLACED', ?, 'Admin')
      `).run(staff.card_id, `Replacement card generated (Version ${newVersion}). Old QR token invalidated. Reason: ${reason}`);

      logAudit('REPLACE_STAFF_ID', 'Admin', 'STAFF', staff.staff_id, `Issued replacement card version ${newVersion}. Reason: ${reason}`);
    });

    replaceTx();

    res.json({
      success: true,
      message: `Replacement ID Card issued (Version ${newVersion}). Old QR token invalidated.`,
      new_token: newToken,
      card_version: newVersion
    });
  } catch (err) {
    console.error('Error replacing staff card:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/staff/:id - Permanently purge staff profile & all associated records from database
router.delete('/:id', (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = db.prepare('SELECT * FROM staff_profiles WHERE id = ?').get(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff profile not found.' });
    }

    db.transaction(() => {
      const cards = db.prepare("SELECT id FROM id_card_records WHERE profile_type = 'STAFF' AND profile_id = ?").all(staffId);
      for (const c of cards) {
        db.prepare('DELETE FROM qr_verification_tokens WHERE card_id = ?').run(c.id);
        db.prepare('DELETE FROM id_card_history WHERE card_id = ?').run(c.id);
        db.prepare('DELETE FROM id_applications WHERE card_id = ?').run(c.id);
      }
      db.prepare("DELETE FROM id_card_records WHERE profile_type = 'STAFF' AND profile_id = ?").run(staffId);
      db.prepare("DELETE FROM id_applications WHERE application_type = 'STAFF' AND (email = ? OR mobile = ? OR profile_id = ?)").run(staff.email, staff.mobile, staffId);
      db.prepare('DELETE FROM staff_profiles WHERE id = ?').run(staffId);
      db.prepare("DELETE FROM auth_users WHERE email = ? AND role != 'ADMIN'").run(staff.email);
      logAudit('STAFF_DELETED', req.user?.email || 'Admin', 'STAFF', staffId, `Permanently purged staff ${staff.full_name} (${staff.staff_id}) from database`, req.ip);
    })();

    res.json({ success: true, message: `Staff ${staff.full_name} permanently purged from database.` });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
