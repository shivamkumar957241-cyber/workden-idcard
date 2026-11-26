const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, logAudit, createNotification } = require('../db');
const { generateCardPreviewPng } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'workden_super_secret_jwt_key_2026_do_not_share';

function getPortalSettings() {
  try {
    return db.prepare('SELECT * FROM id_card_settings WHERE id = 1').get() || {};
  } catch {
    return {};
  }
}

function resolveCardFromToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.purpose !== 'CARD_ACCESS' || !decoded.entity_code) {
    throw new Error('Invalid card access token');
  }

  const card = db.prepare(`
    SELECT c.*, q.token as qr_token
    FROM id_card_records c
    LEFT JOIN qr_verification_tokens q ON q.card_id = c.id AND q.is_active = 1
    WHERE c.entity_code = ?
    ORDER BY c.id DESC LIMIT 1
  `).get(decoded.entity_code);

  if (!card) throw new Error('ID Card record not found.');

  let profile = null;
  if (card.profile_type === 'STAFF') {
    profile = db.prepare('SELECT * FROM staff_profiles WHERE id = ?').get(card.profile_id);
  } else {
    profile = db.prepare('SELECT * FROM user_id_profiles WHERE id = ?').get(card.profile_id);
  }

  const app = db.prepare(`
    SELECT * FROM id_applications
    WHERE card_id = ? OR (email = ? AND application_type = ?)
    ORDER BY id DESC LIMIT 1
  `).get(card.id, profile?.email || '', card.profile_type);

  return { card, profile, app };
}

// GET /api/public-card/:token/preview.png - Render blurred locked (or unlocked) CR80 card PNG for email
router.get('/:token/preview.png', async (req, res) => {
  try {
    const { card, profile, app } = resolveCardFromToken(req.params.token);
    const settings = getPortalSettings();
    const isStaff = card.profile_type === 'STAFF';
    const requiresPayment = isStaff ? (settings.require_staff_payment !== 0) : (settings.require_member_payment !== 0);
    const feeRupees = isStaff ? (parseInt(settings.staff_fee, 10) > 0 ? parseInt(settings.staff_fee, 10) : 249) : (parseInt(settings.member_fee, 10) > 0 ? parseInt(settings.member_fee, 10) : 99);

    let isUnlocked = !requiresPayment;
    if (app) {
      isUnlocked = app.download_unlocked === 1 || !requiresPayment;
    } else {
      const conf = db.prepare("SELECT id FROM payment_confirmations WHERE member_id = ? AND status = 'APPROVED'").get(card.entity_code);
      if (conf) isUnlocked = true;
    }

    const pngBuffer = await generateCardPreviewPng({
      fullName: profile?.full_name || app?.full_name || 'WorkDen User',
      entityCode: card.entity_code,
      profileType: card.profile_type,
      designation: profile?.designation || app?.designation || '',
      department: profile?.department || app?.department || '',
      currentPlan: profile?.current_plan || app?.current_plan || '',
      mobile: profile?.mobile || app?.mobile || '',
      expiryDate: card.expiry_date || '',
      qrToken: card.qr_token || '',
      isUnlocked,
      feeRupees
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pngBuffer);
  } catch (err) {
    res.status(404).send('Preview unavailable');
  }
});

// GET /api/public-card/:token
router.get('/:token', (req, res) => {
  try {
    const { card, profile, app } = resolveCardFromToken(req.params.token);
    const settings = getPortalSettings();
    const isStaff = card.profile_type === 'STAFF';
    const requiresPayment = isStaff ? (settings.require_staff_payment !== 0) : (settings.require_member_payment !== 0);
    const feeRupees = isStaff ? (parseInt(settings.staff_fee, 10) > 0 ? parseInt(settings.staff_fee, 10) : 249) : (parseInt(settings.member_fee, 10) > 0 ? parseInt(settings.member_fee, 10) : 99);
    const keyId = settings.razorpay_key_id || process.env.RAZORPAY_KEY_ID || 'rzp_live_U4VD9FTceH5P0x';

    let isUnlocked = !requiresPayment;
    if (app) {
      isUnlocked = app.download_unlocked === 1 || !requiresPayment;
    } else {
      // Check if an approved payment confirmation exists for this entity_code
      const conf = db.prepare("SELECT id FROM payment_confirmations WHERE member_id = ? AND status = 'APPROVED'").get(card.entity_code);
      if (conf) isUnlocked = true;
    }

    const mergedCard = {
      ...card,
      full_name: profile?.full_name || app?.full_name || 'WorkDen User',
      photo_url: profile?.photo_url || app?.photo_url || '',
      mobile: profile?.mobile || app?.mobile || '',
      email: profile?.email || app?.email || '',
      designation: profile?.designation || app?.designation || '',
      department: profile?.department || app?.department || '',
      current_plan: profile?.current_plan || app?.current_plan || '',
      user_category: profile?.user_category || app?.user_category || 'WorkDen Member'
    };

    res.json({
      success: true,
      card: mergedCard,
      settings: {
        company_name: settings.company_name,
        company_tagline: settings.company_tagline,
        official_email: settings.official_email,
        office_address: settings.office_address,
        authorized_signatory: settings.authorized_signatory,
        card_usage_rules: settings.card_usage_rules,
        lost_card_instructions: settings.lost_card_instructions
      },
      is_unlocked: isUnlocked,
      fee_rupees: feeRupees,
      razorpay_key_id: keyId
    });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired ID card access link.' });
  }
});

// POST /api/public-card/:token/create-order
router.post('/:token/create-order', async (req, res) => {
  try {
    const { card, profile, app } = resolveCardFromToken(req.params.token);
    const settings = getPortalSettings();
    const isStaff = card.profile_type === 'STAFF';
    const feeRupees = isStaff ? (parseInt(settings.staff_fee, 10) > 0 ? parseInt(settings.staff_fee, 10) : 249) : (parseInt(settings.member_fee, 10) > 0 ? parseInt(settings.member_fee, 10) : 99);
    const amountPaise = feeRupees * 100;
    const keyId = settings.razorpay_key_id || process.env.RAZORPAY_KEY_ID || 'rzp_live_U4VD9FTceH5P0x';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId = null;
    if (keySecret && keySecret !== 'your_razorpay_secret_here') {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const order = await razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `wd_pub_${card.id}_${Date.now()}`,
          notes: {
            entity_code: card.entity_code,
            purpose: isStaff ? 'WorkDen Staff ID Card Download' : 'WorkDen Member ID Card Download'
          }
        });
        orderId = order.id;
      } catch (e) {
        console.warn('Public Razorpay orders.create fallback:', e.message);
      }
    }

    const trackingOrderId = orderId || `dir_pub_${card.id}_${Date.now()}`;
    let paymentOrderDbId = null;

    if (app) {
      const result = db.prepare(`
        INSERT INTO payment_orders (application_id, applicant_user_id, razorpay_order_id, amount, currency, status)
        VALUES (?, ?, ?, ?, 'INR', 'CREATED')
      `).run(app.id, app.applicant_user_id, trackingOrderId, amountPaise);
      paymentOrderDbId = result.lastInsertRowid;
    }

    res.json({
      success: true,
      order_id: orderId,
      tracking_order_id: trackingOrderId,
      amount: amountPaise,
      currency: 'INR',
      key_id: keyId,
      payment_order_db_id: paymentOrderDbId,
      prefill: {
        name: profile?.full_name || app?.full_name || '',
        email: profile?.email || app?.email || '',
        contact: profile?.mobile || app?.mobile || ''
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message || 'Could not initiate payment.' });
  }
});

// POST /api/public-card/:token/verify
router.post('/:token/verify', (req, res) => {
  try {
    const { card, profile, app } = resolveCardFromToken(req.params.token);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_order_db_id } = req.body;

    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, error: 'Missing Razorpay payment ID.' });
    }

    const settings = getPortalSettings();
    const isStaff = card.profile_type === 'STAFF';
    const feeRupees = isStaff ? (parseInt(settings.staff_fee, 10) > 0 ? parseInt(settings.staff_fee, 10) : 249) : (parseInt(settings.member_fee, 10) > 0 ? parseInt(settings.member_fee, 10) : 99);
    const amountPaise = feeRupees * 100;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keySecret && keySecret !== 'your_razorpay_secret_here' && razorpay_order_id && razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
      }
    }

    const resolvedOrderId = razorpay_order_id || `dir_pub_${card.id}_${Date.now()}`;

    if (app) {
      let payOrderId = payment_order_db_id;
      if (payOrderId) {
        db.prepare(`
          UPDATE payment_orders
          SET razorpay_payment_id = ?, razorpay_signature = ?, razorpay_order_id = ?, status = 'PAID', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(razorpay_payment_id, razorpay_signature || 'DIRECT_LIVE', resolvedOrderId, payOrderId);
      } else {
        const ins = db.prepare(`
          INSERT INTO payment_orders (application_id, applicant_user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status)
          VALUES (?, ?, ?, ?, ?, ?, 'INR', 'PAID')
        `).run(app.id, app.applicant_user_id, resolvedOrderId, razorpay_payment_id, razorpay_signature || 'DIRECT_LIVE', amountPaise);
        payOrderId = ins.lastInsertRowid;
      }

      db.prepare("UPDATE id_applications SET payment_status = 'VERIFIED', download_unlocked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(app.id);

      const existingConf = db.prepare('SELECT id FROM payment_confirmations WHERE payment_order_id = ?').get(payOrderId);
      if (!existingConf) {
        db.prepare(`
          INSERT INTO payment_confirmations
            (application_id, applicant_user_id, payment_order_id, member_name, member_id,
             razorpay_payment_id, razorpay_order_id, amount, payment_date, status, reviewed_by, reviewed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 'Razorpay Direct Unlock', CURRENT_TIMESTAMP)
        `).run(
          app.id, app.applicant_user_id, payOrderId,
          profile?.full_name || app.full_name,
          card.entity_code,
          razorpay_payment_id, resolvedOrderId,
          amountPaise, new Date().toISOString()
        );
      }

      createNotification(
        app.applicant_user_id,
        'Payment Successful — ID Card Unlocked!',
        `Your ₹${feeRupees} payment (${razorpay_payment_id}) is verified. Your Official WorkDen ID Card is unlocked.`,
        'SUCCESS'
      );
    } else {
      // Admin-created card without application: record confirmation with application_id=0, applicant_user_id=0
      db.prepare(`
        INSERT INTO payment_confirmations
          (application_id, applicant_user_id, payment_order_id, member_name, member_id,
           razorpay_payment_id, razorpay_order_id, amount, payment_date, status, reviewed_by, reviewed_at)
        VALUES (0, 0, 0, ?, ?, ?, ?, ?, ?, 'APPROVED', 'Razorpay Direct Unlock', CURRENT_TIMESTAMP)
      `).run(
        profile?.full_name || card.entity_code,
        card.entity_code,
        razorpay_payment_id, resolvedOrderId,
        amountPaise, new Date().toISOString()
      );
    }

    logAudit('PUBLIC_PAYMENT_UNLOCK', profile?.email || card.entity_code, 'CARD', card.id,
      `Direct payment ${razorpay_payment_id} (₹${feeRupees}) unlocked card ${card.entity_code}`, req.ip);

    res.json({ success: true, unlocked: true, message: 'Payment verified & ID Card unlocked!' });
  } catch (err) {
    console.error('Public card verify error:', err);
    res.status(500).json({ success: false, error: err.message || 'Verification failed.' });
  }
});

module.exports = router;
