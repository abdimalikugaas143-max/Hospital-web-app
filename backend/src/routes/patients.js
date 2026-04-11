const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

function generateCardNumber() {
  const num = Math.floor(Math.random() * 999999) + 1;
  return `HC-${String(num).padStart(6, '0')}`;
}

// GET /api/patients - receptionist/admin
router.get('/', authenticate, authorize('receptionist', 'admin'), async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.id, p.card_number, p.date_of_birth, p.gender, p.blood_type, p.address,
             u.name, u.email, u.phone, u.created_at
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = true
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.card_number ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.name ILIKE $${params.length})`;
    }
    query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM patients p JOIN users u ON p.user_id = u.id WHERE u.is_active = true${search ? ` AND (p.card_number ILIKE $1 OR u.phone ILIKE $1 OR u.name ILIKE $1)` : ''}`,
      search ? [`%${search}%`] : []
    );

    res.json({
      patients: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get patients error:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// GET /api/patients/search - receptionist/admin
router.get('/search', authenticate, authorize('receptionist', 'admin'), async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query required' });
  try {
    const result = await pool.query(
      `SELECT p.id, p.card_number, p.date_of_birth, p.gender, p.blood_type,
              u.name, u.email, u.phone
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE u.is_active = true
       AND (p.card_number ILIKE $1 OR u.phone ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1)
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json({ patients: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/patients/me - patient's own profile
router.get('/me', authenticate, authorize('patient'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name, u.email, u.phone
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient record not found' });
    res.json({ patient: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
});

// GET /api/patients/:id - receptionist/admin/doctor
router.get('/:id', authenticate, authorize('receptionist', 'admin', 'doctor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name, u.email, u.phone
       FROM patients p JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// POST /api/patients/walk-in - receptionist registers walk-in patient
router.post('/walk-in', authenticate, authorize('receptionist', 'admin'), async (req, res) => {
  const { name, email, password, phone, date_of_birth, gender, blood_type, address } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tempEmail = email || `walkin_${Date.now()}@hospital.local`;
    const tempPassword = password || Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'patient', $4) RETURNING id`,
      [name, tempEmail, passwordHash, phone]
    );

    let cardNumber;
    let cardExists = true;
    while (cardExists) {
      cardNumber = generateCardNumber();
      const check = await client.query('SELECT id FROM patients WHERE card_number = $1', [cardNumber]);
      cardExists = check.rows.length > 0;
    }

    const patientResult = await client.query(
      `INSERT INTO patients (user_id, card_number, date_of_birth, gender, blood_type, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userResult.rows[0].id, cardNumber, date_of_birth || null, gender || null, blood_type || null, address || null]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Walk-in patient registered',
      patient: { ...patientResult.rows[0], name, phone, email: tempEmail },
      tempPassword: !password ? tempPassword : undefined,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Walk-in registration error:', err);
    res.status(500).json({ error: 'Failed to register walk-in patient' });
  } finally {
    client.release();
  }
});

// GET /api/patients/:id/medical-records
router.get('/:id/medical-records', authenticate, authorize('doctor', 'admin', 'receptionist'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*, u.name as doctor_name, a.appointment_date
       FROM medical_records mr
       LEFT JOIN doctors d ON mr.doctor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       WHERE mr.patient_id = $1
       ORDER BY mr.created_at DESC`,
      [req.params.id]
    );
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

module.exports = router;
