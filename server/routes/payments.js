try { require('dotenv').config(); } catch {}
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db, logAudit, createNotification } = require('../db');
const { requireAuth } = require('../middleware/auth');

const PAYMENT_AMOUNT = 9900; // ₹99 in paise

function getRazorpay() {
  const Razorpay = require('razorpay');
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keySecret === 'your_razorpay_secret_here') {
    throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/payments/create-order
// Member creates a Razorpay order for ₹99 ID card download
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { application_id } = req.body;

    // Only USER role can pay; Staff downloads are free
    if (req.user.role === 'STAFF') {
      return res.status(403).json({ success: false, error: 'Staff ID Card downloads are free. No payment required.' });
    }

    // Validate application
    const app = db.prepare('SELECT * FROM id_applications WHERE id = ? AND applicant_user_id = ?').get(application_id, userId);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });
    if (app.application_type === 'STAFF') {
      return res.status(403).json({ success: false, error: 'Staff ID Card downloads do not require payment.' });
    }
    if (app.status !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Application must be approved before payment.' });
    }
    if (app.download_unlocked === 1) {
      return res.status(400).json({ success: false, error: 'Download already unlocked. No further payment needed.' });
    }

    // Check for existing paid/confirmed order
    const existingPaid = db.prepare(`
      SELECT * FROM payment_orders 
      WHERE application_id = ? AND status = 'PAID'
    `).get(application_id);
    if (existingPaid) {
      return res.status(400).json({ success: false, error: 'Payment already completed for this application.' });
    }

    // Create Razorpay order
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: PAYMENT_AMOUNT,
      currency: 'INR',
      receipt: `wd_app_${application_id}_user_${userId}`,
      notes: {
        application_id: String(application_id),
        user_id: String(userId),
        user_name: req.user.full_name,
        user_email: req.user.email,
        purpose: 'WorkDen Member ID Card Download'
      }
    });

    // Store order in DB
    const result = db.prepare(`
      INSERT INTO payment_orders (application_id, applicant_user_id, razorpay_order_id, amount, currency, status)
      VALUES (?, ?, ?, ?, 'INR', 'CREATED')
    `).run(application_id, userId, order.id, PAYMENT_AMOUNT);

    logAudit('PAYMENT_ORDER_CREATED', req.user.email, 'PAYMENT', result.lastInsertRowid,
      `Razorpay order ${order.id} created for ₹99`, req.ip);

    res.json({
      success: true,
      order_id: order.id,
      amount: PAYMENT_AMOUNT,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      payment_order_db_id: result.lastInsertRowid,
      prefill: {
        name: req.user.full_name,
        email: req.user.email
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create payment order.' });
  }
});

// POST /api/payments/verify
// Verify Razorpay payment signature after successful payment
router.post('/verify', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      application_id,
      payment_order_db_id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification data.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret === 'your_razorpay_secret_here') {
      return res.status(500).json({ success: false, error: 'Payment verification not configured.' });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logAudit('PAYMENT_SIGNATURE_INVALID', req.user.email, 'PAYMENT', application_id,
        `Invalid signature for order ${razorpay_order_id}`, req.ip);
      return res.status(400).json({ success: false, error: 'Payment verification failed: invalid signature.' });
    }

    // Update payment order
    const payOrder = db.prepare('SELECT * FROM payment_orders WHERE razorpay_order_id = ? AND applicant_user_id = ?')
      .get(razorpay_order_id, userId);

    if (!payOrder) {
      return res.status(404).json({ success: false, error: 'Payment order not found.' });
    }
    if (payOrder.status === 'PAID') {
      return res.status(400).json({ success: false, error: 'Payment already processed.' });
    }

    db.prepare(`
      UPDATE payment_orders 
      SET status = 'PAID', razorpay_payment_id = ?, razorpay_signature = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(razorpay_payment_id, razorpay_signature, payOrder.id);

    logAudit('PAYMENT_VERIFIED', req.user.email, 'PAYMENT', payOrder.id,
      `Payment ${razorpay_payment_id} verified for order ${razorpay_order_id}`, req.ip);

    res.json({
      success: true,
      message: 'Payment verified successfully.',
      payment_order_id: payOrder.id,
      razorpay_payment_id,
      razorpay_order_id,
      amount: payOrder.amount
    });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ success: false, error: 'Payment verification error.' });
  }
});

// POST /api/payments/submit-confirmation
// Member submits payment confirmation form after payment
router.post('/submit-confirmation', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      application_id,
      payment_order_id,
      razorpay_payment_id,
      razorpay_order_id,
      amount,
      payment_date
    } = req.body;

    if (!application_id || !payment_order_id || !razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    // Validate the payment order is PAID
    const payOrder = db.prepare('SELECT * FROM payment_orders WHERE id = ? AND applicant_user_id = ? AND status = ?')
      .get(payment_order_id, userId, 'PAID');
    if (!payOrder) {
      return res.status(400).json({ success: false, error: 'Payment not verified. Please complete payment first.' });
    }

    // Prevent duplicate confirmation
    const existing = db.prepare('SELECT id FROM payment_confirmations WHERE payment_order_id = ?').get(payment_order_id);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Confirmation already submitted for this payment.' });
    }

    const app = db.prepare('SELECT full_name FROM id_applications WHERE id = ?').get(application_id);
    const memberIdRow = db.prepare('SELECT entity_code FROM id_card_records WHERE id = (SELECT card_id FROM id_applications WHERE id = ?)').get(application_id);

    const result = db.prepare(`
      INSERT INTO payment_confirmations 
        (application_id, applicant_user_id, payment_order_id, member_name, member_id,
         razorpay_payment_id, razorpay_order_id, amount, payment_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
    `).run(
      application_id, userId, payment_order_id,
      app?.full_name || req.user.full_name,
      memberIdRow?.entity_code || null,
      razorpay_payment_id, razorpay_order_id,
      amount || PAYMENT_AMOUNT,
      payment_date || new Date().toISOString()
    );

    // Update application payment_status
    db.prepare("UPDATE id_applications SET payment_status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(application_id);

    logAudit('PAYMENT_CONFIRMATION_SUBMITTED', req.user.email, 'PAYMENT_CONFIRMATION',
      result.lastInsertRowid, `Payment confirmation submitted by ${req.user.email}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Payment confirmation submitted. Admin will verify and unlock your ID Card download.',
      confirmation_id: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Submit confirmation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/payments/my-status/:application_id
// Get payment status for member's own application
router.get('/my-status/:application_id', requireAuth, (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM id_applications WHERE id = ? AND applicant_user_id = ?')
      .get(req.params.application_id, req.user.id);
    if (!app) return res.status(404).json({ success: false, error: 'Application not found.' });

    const payOrder = db.prepare(`
      SELECT * FROM payment_orders WHERE application_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.params.application_id);

    const confirmation = db.prepare(`
      SELECT * FROM payment_confirmations WHERE application_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.params.application_id);

    res.json({
      success: true,
      application: {
        id: app.id,
        status: app.status,
        payment_status: app.payment_status,
        download_unlocked: app.download_unlocked
      },
      payment_order: payOrder || null,
      confirmation: confirmation || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/payments/all (Admin)
router.get('/all', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const { status, search, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT pc.*, u.email as user_email, a.full_name as applicant_name, a.mobile, a.email as app_email
      FROM payment_confirmations pc
      JOIN auth_users u ON u.id = pc.applicant_user_id
      JOIN id_applications a ON a.id = pc.application_id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'ALL') { query += ' AND pc.status = ?'; params.push(status); }
    if (search) {
      query += ' AND (pc.member_name LIKE ? OR pc.razorpay_payment_id LIKE ? OR u.email LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t);
    }
    const total = db.prepare(`SELECT COUNT(*) as c FROM (${query})`).get(...params).c;
    query += ' ORDER BY pc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/:id/approve (Admin)
router.post('/:id/approve', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const conf = db.prepare('SELECT * FROM payment_confirmations WHERE id = ?').get(req.params.id);
    if (!conf) return res.status(404).json({ success: false, error: 'Confirmation not found.' });
    if (conf.status !== 'SUBMITTED') return res.status(400).json({ success: false, error: 'Already processed.' });

    db.transaction(() => {
      db.prepare(`
        UPDATE payment_confirmations 
        SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.user.email, conf.id);

      db.prepare(`
        UPDATE id_applications 
        SET payment_status = 'VERIFIED', download_unlocked = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(conf.application_id);

      // Create notification for user
      createNotification(conf.applicant_user_id,
        '🎉 Payment Approved!',
        'Your ₹99 payment has been verified. Your Member ID Card is now unlocked for download!',
        'SUCCESS');

      logAudit('PAYMENT_APPROVED', req.user.email, 'PAYMENT_CONFIRMATION', conf.id,
        `Payment confirmation approved. Download unlocked for application ${conf.application_id}`, req.ip);
    })();

    res.json({ success: true, message: 'Payment approved. Member download unlocked.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/:id/reject (Admin)
router.post('/:id/reject', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Admin access required.' });
    const { admin_remarks } = req.body;
    const conf = db.prepare('SELECT * FROM payment_confirmations WHERE id = ?').get(req.params.id);
    if (!conf) return res.status(404).json({ success: false, error: 'Confirmation not found.' });
    if (conf.status !== 'SUBMITTED') return res.status(400).json({ success: false, error: 'Already processed.' });

    db.transaction(() => {
      db.prepare(`
        UPDATE payment_confirmations 
        SET status = 'REJECTED', admin_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(admin_remarks || 'Payment could not be verified.', req.user.email, conf.id);

      db.prepare("UPDATE id_applications SET payment_status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(conf.application_id);

      createNotification(conf.applicant_user_id,
        '❌ Payment Verification Failed',
        `Your payment verification was rejected. Reason: ${admin_remarks || 'Payment could not be verified.'}. Please retry payment.`,
        'ERROR');

      logAudit('PAYMENT_REJECTED', req.user.email, 'PAYMENT_CONFIRMATION', conf.id,
        `Payment confirmation rejected for application ${conf.application_id}`, req.ip);
    })();

    res.json({ success: true, message: 'Payment confirmation rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/payments/notifications (Member's own notifications)
router.get('/notifications', requireAuth, (req, res) => {
  try {
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(req.user.id);
    res.json({ success: true, data: notifs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/notifications/read-all
router.post('/notifications/read-all', requireAuth, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
