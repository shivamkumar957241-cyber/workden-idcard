const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, logAudit } = require('../db');
const { signToken, requireAuth, requireAdmin } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM auth_users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your email and password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials. Please check your email and password.' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      profile_id: user.profile_id,
      profile_type: user.profile_type
    });

    logAudit('LOGIN', user.email, 'AUTH', user.id, `User logged in. Role: ${user.role}`, req.ip);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        profile_id: user.profile_id,
        profile_type: user.profile_type
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error during login.' });
  }
});

// POST /api/auth/register - Self-registration (creates USER account; admin creates STAFF)
router.post('/register', (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const result = db.prepare(`
      INSERT INTO auth_users (email, password_hash, role, full_name, is_active)
      VALUES (?, ?, 'USER', ?, 1)
    `).run(email.toLowerCase().trim(), passwordHash, full_name.trim());

    const newUser = db.prepare('SELECT id, email, role, full_name FROM auth_users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name,
      profile_id: null,
      profile_type: null
    });

    logAudit('REGISTER', newUser.email, 'AUTH', newUser.id, `New user registered. Role: USER`, req.ip);

    res.status(201).json({
      success: true,
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, role, full_name, profile_id, profile_type, created_at FROM auth_users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET /api/auth/users - Admin: List all auth users
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, email, role, full_name, profile_id, profile_type, is_active, created_at FROM auth_users ORDER BY created_at DESC').all();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// POST /api/auth/create-staff-account - Admin creates an account for a staff member after approving their ID
router.post('/create-staff-account', requireAuth, requireAdmin, (req, res) => {
  try {
    const { email, full_name, profile_id, temp_password } = req.body;
    if (!email || !full_name || !profile_id) {
      return res.status(400).json({ success: false, error: 'Email, full name, and profile_id required.' });
    }

    const existing = db.prepare('SELECT id FROM auth_users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      // If user exists, just link the profile
      db.prepare('UPDATE auth_users SET profile_id = ?, profile_type = ?, role = ? WHERE email = ?')
        .run(profile_id, 'STAFF', 'STAFF', email.toLowerCase().trim());
      return res.json({ success: true, message: 'Existing account linked to staff profile.' });
    }

    const password = temp_password || 'WorkDen@123';
    const passwordHash = bcrypt.hashSync(password, 12);
    db.prepare(`
      INSERT INTO auth_users (email, password_hash, role, full_name, profile_id, profile_type, is_active)
      VALUES (?, ?, 'STAFF', ?, ?, 'STAFF', 1)
    `).run(email.toLowerCase().trim(), passwordHash, full_name.trim(), profile_id);

    logAudit('CREATE_STAFF_ACCOUNT', req.user.email, 'AUTH', profile_id, `Staff account created for ${email}`, req.ip);
    res.status(201).json({ success: true, message: `Staff account created. Temp password: ${password}` });
  } catch (err) {
    console.error('Create staff account error:', err);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// PUT /api/auth/change-password - Change own password
router.put('/change-password', requireAuth, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Current and new password required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(req.user.id);
    const isValid = bcrypt.compareSync(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    const newHash = bcrypt.hashSync(new_password, 12);
    db.prepare('UPDATE auth_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user.id);
    logAudit('CHANGE_PASSWORD', req.user.email, 'AUTH', req.user.id, 'Password changed.', req.ip);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// GET /api/auth/accounts - Admin list all registered accounts with card/application status
router.get('/accounts', requireAuth, requireAdmin, (req, res) => {
  try {
    const query = `
      SELECT 
        u.id as user_id,
        u.email,
        u.full_name,
        u.role,
        u.created_at,
        app.id as application_id,
        app.status as application_status,
        app.application_type,
        card.id as card_id,
        card.entity_code,
        card.status as card_status
      FROM auth_users u
      LEFT JOIN id_applications app ON app.email = u.email OR app.applicant_user_id = u.id
      LEFT JOIN id_card_records card ON card.id = app.card_id
      ORDER BY u.id DESC
    `;
    const accounts = db.prepare(query).all();
    res.json({ success: true, data: accounts });
  } catch (err) {
    console.error('Error fetching accounts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/accounts/:id - Admin permanently delete a registered account & all associated data
router.delete('/accounts/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (req.user.id === targetUserId) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own admin account.' });
    }

    const targetUser = db.prepare('SELECT * FROM auth_users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    db.transaction(() => {
      // 1. Find all applications by email or applicant_user_id
      const apps = db.prepare('SELECT id, card_id FROM id_applications WHERE email = ? OR applicant_user_id = ?').all(targetUser.email, targetUserId);
      for (const a of apps) {
        if (a.card_id) {
          db.prepare('DELETE FROM qr_verification_tokens WHERE card_id = ?').run(a.card_id);
          db.prepare('DELETE FROM id_card_history WHERE card_id = ?').run(a.card_id);
          db.prepare('DELETE FROM id_card_records WHERE id = ?').run(a.card_id);
        }
      }
      db.prepare('DELETE FROM id_applications WHERE email = ? OR applicant_user_id = ?').run(targetUser.email, targetUserId);

      // 2. Delete from staff_profiles if email matches
      const staff = db.prepare('SELECT id FROM staff_profiles WHERE email = ?').all(targetUser.email);
      for (const s of staff) {
        const cList = db.prepare("SELECT id FROM id_card_records WHERE profile_type = 'STAFF' AND profile_id = ?").all(s.id);
        for (const c of cList) {
          db.prepare('DELETE FROM qr_verification_tokens WHERE card_id = ?').run(c.id);
          db.prepare('DELETE FROM id_card_history WHERE card_id = ?').run(c.id);
          db.prepare('DELETE FROM id_card_records WHERE id = ?').run(c.id);
        }
        db.prepare('DELETE FROM staff_profiles WHERE id = ?').run(s.id);
      }

      // 3. Delete from user_id_profiles if email matches
      const userProfs = db.prepare('SELECT id FROM user_id_profiles WHERE email = ?').all(targetUser.email);
      for (const u of userProfs) {
        const cList = db.prepare("SELECT id FROM id_card_records WHERE profile_type = 'USER' AND profile_id = ?").all(u.id);
        for (const c of cList) {
          db.prepare('DELETE FROM qr_verification_tokens WHERE card_id = ?').run(c.id);
          db.prepare('DELETE FROM id_card_history WHERE card_id = ?').run(c.id);
          db.prepare('DELETE FROM id_card_records WHERE id = ?').run(c.id);
        }
        db.prepare('DELETE FROM user_id_profiles WHERE id = ?').run(u.id);
      }

      // 4. Finally delete from auth_users
      db.prepare('DELETE FROM auth_users WHERE id = ?').run(targetUserId);

      logAudit('ACCOUNT_PURGED', req.user.email, 'AUTH', targetUserId,
        `Permanently purged account and all linked data for ${targetUser.full_name} (${targetUser.email})`, req.ip);
    })();

    res.json({ success: true, message: `Account for ${targetUser.full_name} permanently deleted.` });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
