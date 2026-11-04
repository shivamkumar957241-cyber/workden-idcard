const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');

// GET /api/settings - Fetch all settings, departments, designations
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM id_card_settings WHERE id = 1').get();
    const departments = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
    const designations = db.prepare('SELECT * FROM designations ORDER BY name ASC').all();

    res.json({
      success: true,
      data: {
        settings: settings || {},
        departments: departments || [],
        designations: designations || []
      }
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings - Update ID Card Design Settings
router.put('/', (req, res) => {
  try {
    const {
      company_name, company_tagline, company_logo, company_website,
      official_email, office_address, authorized_signatory, signature_image,
      primary_color, secondary_color, accent_color,
      card_usage_rules, lost_card_instructions, qr_position
    } = req.body;

    db.prepare(`
      UPDATE id_card_settings
      SET 
        company_name = COALESCE(?, company_name),
        company_tagline = COALESCE(?, company_tagline),
        company_logo = COALESCE(?, company_logo),
        company_website = COALESCE(?, company_website),
        official_email = COALESCE(?, official_email),
        office_address = COALESCE(?, office_address),
        authorized_signatory = COALESCE(?, authorized_signatory),
        signature_image = COALESCE(?, signature_image),
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        accent_color = COALESCE(?, accent_color),
        card_usage_rules = COALESCE(?, card_usage_rules),
        lost_card_instructions = COALESCE(?, lost_card_instructions),
        qr_position = COALESCE(?, qr_position),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      company_name, company_tagline, company_logo, company_website,
      official_email, office_address, authorized_signatory, signature_image,
      primary_color, secondary_color, accent_color,
      card_usage_rules, lost_card_instructions, qr_position
    );

    logAudit('UPDATE_SETTINGS', 'Admin', 'SETTINGS', '1', 'ID Card Design and Branding Settings updated.');

    res.json({ success: true, message: 'ID Card Design Settings updated successfully' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/departments - Add Custom Department
router.post('/departments', (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Department name is required' });
    }

    const trimmed = name.trim();
    const existing = db.prepare('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)').get(trimmed);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Department already exists' });
    }

    const result = db.prepare('INSERT INTO departments (name, code) VALUES (?, ?)').run(trimmed, code ? code.trim().toUpperCase() : null);

    logAudit('ADD_DEPARTMENT', 'Admin', 'DEPARTMENT', result.lastInsertRowid, `Department ${trimmed} added.`);

    res.status(201).json({
      success: true,
      message: 'Department added successfully',
      data: { id: result.lastInsertRowid, name: trimmed, code }
    });
  } catch (err) {
    console.error('Error adding department:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/settings/departments/:id
router.delete('/departments/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
    logAudit('DELETE_DEPARTMENT', 'Admin', 'DEPARTMENT', req.params.id, 'Department deleted.');
    res.json({ success: true, message: 'Department removed' });
  } catch (err) {
    console.error('Error deleting department:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/designations - Add Custom Designation
router.post('/designations', (req, res) => {
  try {
    const { name, department_name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Designation name is required' });
    }

    const trimmed = name.trim();
    const existing = db.prepare('SELECT id FROM designations WHERE LOWER(name) = LOWER(?)').get(trimmed);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Designation already exists' });
    }

    const result = db.prepare('INSERT INTO designations (name, department_name) VALUES (?, ?)').run(trimmed, department_name || null);

    logAudit('ADD_DESIGNATION', 'Admin', 'DESIGNATION', result.lastInsertRowid, `Designation ${trimmed} added.`);

    res.status(201).json({
      success: true,
      message: 'Designation added successfully',
      data: { id: result.lastInsertRowid, name: trimmed, department_name }
    });
  } catch (err) {
    console.error('Error adding designation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/settings/designations/:id
router.delete('/designations/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM designations WHERE id = ?').run(req.params.id);
    logAudit('DELETE_DESIGNATION', 'Admin', 'DESIGNATION', req.params.id, 'Designation removed.');
    res.json({ success: true, message: 'Designation removed' });
  } catch (err) {
    console.error('Error deleting designation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
