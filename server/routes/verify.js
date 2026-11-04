const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { db, updateExpiredCards, logAudit } = require('../db');

// Helper to resolve photo to self-contained Base64 Data URI or full URL
// This ensures mobile phones scanning from Google Lens on external 4G/5G networks can ALWAYS load the photo!
function resolvePhotoDataUri(photoUrl) {
  if (!photoUrl) return null;
  // If already base64 or remote absolute URL
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  // If relative upload path e.g. /uploads/179369...
  if (photoUrl.startsWith('/uploads/')) {
    const filename = photoUrl.replace('/uploads/', '');
    const localPath = path.join(__dirname, '..', 'uploads', filename);
    if (fs.existsSync(localPath)) {
      try {
        const ext = path.extname(localPath).replace('.', '').toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const buffer = fs.readFileSync(localPath);
        return `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (e) {
        console.error('Error encoding photo to base64:', e);
      }
    }
  }
  return photoUrl;
}

// GET /api/verify/:token - Public verification data API
router.get('/:token', (req, res) => {
  try {
    updateExpiredCards();
    const { token } = req.params;

    if (!token || token.trim().length < 8) {
      return res.status(404).json({
        success: false,
        verification_status: 'INVALID ID',
        message: 'Invalid or missing QR verification token'
      });
    }

    // Lookup token
    const tokenRecord = db.prepare(`
      SELECT 
        q.id as token_id,
        q.token,
        q.is_active as token_active,
        q.scan_count,
        c.id as card_id,
        c.card_number,
        c.profile_type,
        c.profile_id,
        c.entity_code,
        c.issue_date,
        c.expiry_date,
        c.validity_period,
        c.status as raw_status,
        c.card_version,
        c.authorized_by,
        c.created_at,
        s.full_name as staff_name,
        s.photo_url as staff_photo,
        s.designation as staff_designation,
        s.department as staff_department,
        s.joining_date as staff_joining,
        s.work_location as staff_location,
        u.full_name as user_name,
        u.photo_url as user_photo,
        u.current_plan as user_plan,
        u.user_category as user_category,
        u.registration_date as user_registration
      FROM qr_verification_tokens q
      JOIN id_card_records c ON q.card_id = c.id
      LEFT JOIN staff_profiles s ON c.profile_type = 'STAFF' AND c.profile_id = s.id
      LEFT JOIN user_id_profiles u ON c.profile_type = 'USER' AND c.profile_id = u.id
      WHERE q.token = ?
    `).get(token);

    if (!tokenRecord) {
      return res.status(404).json({
        success: false,
        verification_status: 'INVALID ID',
        message: 'This QR code does not match any official WorkDen record or has been permanently decommissioned.'
      });
    }

    // Increment scan count & update timestamp
    db.prepare(`
      UPDATE qr_verification_tokens
      SET scan_count = scan_count + 1, last_scanned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tokenRecord.token_id);

    // Get company settings for official name
    const settings = db.prepare('SELECT company_name, company_website, official_email, office_address FROM id_card_settings WHERE id = 1').get() || {};

    // Determine live status
    const today = new Date().toISOString().split('T')[0];
    let liveStatus = 'INVALID ID';

    if (tokenRecord.raw_status === 'PENDING') {
      liveStatus = 'PENDING APPROVAL';
    } else if (tokenRecord.raw_status === 'REVOKED' || tokenRecord.token_active === 0) {
      liveStatus = 'REVOKED';
    } else if (tokenRecord.raw_status === 'SUSPENDED') {
      liveStatus = 'SUSPENDED';
    } else if (tokenRecord.expiry_date && tokenRecord.expiry_date < today) {
      liveStatus = 'EXPIRED';
    } else if (tokenRecord.raw_status === 'ACTIVE') {
      liveStatus = 'ACTIVE & VALID';
    }

    const isStaff = tokenRecord.profile_type === 'STAFF';
    const rawPhoto = isStaff ? tokenRecord.staff_photo : tokenRecord.user_photo;
    const resolvedPhoto = resolvePhotoDataUri(rawPhoto);

    // Build sanitised public payload (STRICTLY NO PRIVATE MOBILE, RESIDENTIAL ADDRESS, DOB)
    const publicData = {
      verified: liveStatus === 'ACTIVE & VALID',
      verification_status: liveStatus,
      is_staff: isStaff,
      entity_type: isStaff ? 'WorkDen Official Staff' : 'Registered WorkDen User',
      id_number: tokenRecord.entity_code,
      full_name: isStaff ? tokenRecord.staff_name : tokenRecord.user_name,
      photo_url: resolvedPhoto,
      organization: settings.company_name || 'WORKDEN',
      role_or_plan: isStaff ? tokenRecord.staff_designation : (tokenRecord.user_plan || 'Active Plan'),
      department_or_category: isStaff ? tokenRecord.staff_department : (tokenRecord.user_category || 'Registered Member'),
      // Joining date is ONLY for staff, completely omitted for users as requested
      joining_date: isStaff ? tokenRecord.staff_joining : null,
      issue_date: tokenRecord.issue_date,
      expiry_date: tokenRecord.expiry_date,
      card_version: tokenRecord.card_version,
      authorized_by: tokenRecord.authorized_by || 'WorkDen Operations',
      server_verified_at: new Date().toISOString(),
      official_portal: settings.company_website || 'https://workden.online'
    };

    logAudit('PUBLIC_QR_SCAN', 'Public User / Google Lens', 'TOKEN', token, {
      id_number: tokenRecord.entity_code,
      status: liveStatus,
      scan_count: tokenRecord.scan_count + 1
    }, req.ip || 'Remote Scanner');

    res.json({
      success: true,
      data: publicData
    });
  } catch (err) {
    console.error('Error during QR verification:', err);
    res.status(500).json({ success: false, error: err.message, verification_status: 'SERVER ERROR' });
  }
});

module.exports = router;
