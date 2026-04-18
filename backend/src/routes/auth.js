const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const demo = require('../demo-data');

// Generate card number
function generateCardNumber() {
  const num = Math.floor(Math.random() * 999999) + 1;
  return `HC-${String(num).padStart(6, '0')}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, phone, date_of_birth, gender, blood_type, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, 'patient', $4) RETURNING id, name, email, role, phone`,
      [name, email, passwordHash, phone || null]
    );

    const user = userResult.rows[0];

    // Generate unique card number
    let cardNumber;
    let cardExists = true;
    while (cardExists) {
      cardNumber = generateCardNumber();
      const check = await client.query('SELECT id FROM patients WHERE card_number = $1', [cardNumber]);
      cardExists = check.rows.length > 0;
    }

    const patientResult = await client.query(
      `INSERT INTO patients (user_id, card_number, date_of_birth, gender, blood_type, address)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, card_number`,
      [user.id, cardNumber, date_of_birth || null, gender || null, blood_type || null, address || null]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        patientId: patientResult.rows[0].id,
        cardNumber: patientResult.rows[0].card_number,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Demo mode — no database configured
  if (demo.demoMode) {
    const user = await demo.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const isValid = await demo.verifyPassword(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'demo_jwt_secret_key',
      { expiresIn: '7d' }
    );
    const patientExtra = user.role === 'patient' ? (() => { const p = demo.getPatientExtra(user.id); return p ? { patientId: p.id, cardNumber: p.card_number } : {}; })() : {};
    const doctorExtra = user.role === 'doctor' ? (() => { const d = demo.getDoctorExtra(user.id); return d ? { doctorId: d.id, departmentId: d.department_id, specialization: d.specialization, departmentName: d.departmentName } : {}; })() : {};
    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, ...patientExtra, ...doctorExtra },
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, phone, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated. Contact admin.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get patient info if patient role
    let patientInfo = null;
    if (user.role === 'patient') {
      const patientResult = await pool.query(
        'SELECT id, card_number FROM patients WHERE user_id = $1',
        [user.id]
      );
      if (patientResult.rows.length > 0) {
        patientInfo = patientResult.rows[0];
      }
    }

    // Get doctor info if doctor role
    let doctorInfo = null;
    if (user.role === 'doctor') {
      const doctorResult = await pool.query(
        `SELECT d.id, d.department_id, d.specialization, dep.name as department_name
         FROM doctors d
         LEFT JOIN departments dep ON d.department_id = dep.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (doctorResult.rows.length > 0) {
        doctorInfo = doctorResult.rows[0];
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        ...(patientInfo && { patientId: patientInfo.id, cardNumber: patientInfo.card_number }),
        ...(doctorInfo && { doctorId: doctorInfo.id, departmentId: doctorInfo.department_id, specialization: doctorInfo.specialization, departmentName: doctorInfo.department_name }),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    let extra = {};
    if (req.user.role === 'patient') {
      const result = await pool.query(
        'SELECT id, card_number, date_of_birth, gender, blood_type, address FROM patients WHERE user_id = $1',
        [req.user.id]
      );
      if (result.rows.length > 0) extra = { patient: result.rows[0] };
    }
    if (req.user.role === 'doctor') {
      const result = await pool.query(
        `SELECT d.id, d.department_id, d.specialization, d.bio, dep.name as department_name
         FROM doctors d LEFT JOIN departments dep ON d.department_id = dep.id
         WHERE d.user_id = $1`,
        [req.user.id]
      );
      if (result.rows.length > 0) extra = { doctor: result.rows[0] };
    }
    res.json({ user: { ...req.user, ...extra } });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  const { name, phone, date_of_birth, gender, blood_type, address, emergency_contact, emergency_phone } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3',
      [name, phone, req.user.id]
    );
    if (req.user.role === 'patient') {
      await client.query(
        `UPDATE patients SET
          date_of_birth = COALESCE($1, date_of_birth),
          gender = COALESCE($2, gender),
          blood_type = COALESCE($3, blood_type),
          address = COALESCE($4, address),
          emergency_contact = COALESCE($5, emergency_contact),
          emergency_phone = COALESCE($6, emergency_phone)
         WHERE user_id = $7`,
        [date_of_birth, gender, blood_type, address, emergency_contact, emergency_phone, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  } finally {
    client.release();
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
