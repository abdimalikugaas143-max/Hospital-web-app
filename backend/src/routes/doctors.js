const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const demo = require('../demo-data');

// GET /api/doctors - public
router.get('/', async (req, res) => {
  if (demo.demoMode) return res.json({ doctors: demo.DEMO_DOCTORS });
  try {
    const { department_id } = req.query;
    let query = `
      SELECT d.id, d.specialization, d.bio, d.available_days, d.consultation_fee,
             u.name, u.email, u.phone,
             dep.id as department_id, dep.name as department_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dep ON d.department_id = dep.id
      WHERE d.is_active = true AND u.is_active = true
    `;
    const params = [];
    if (department_id) {
      params.push(department_id);
      query += ` AND d.department_id = $${params.length}`;
    }
    query += ' ORDER BY u.name';
    const result = await pool.query(query, params);
    res.json({ doctors: result.rows });
  } catch (err) {
    console.error('Get doctors error:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, u.name, u.email, u.phone, dep.name as department_name
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ doctor: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// GET /api/doctors/:id/available-slots
router.get('/:id/available-slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    // Get doctor's existing appointments for the date
    const appointmentsResult = await pool.query(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2
       AND status NOT IN ('cancelled')`,
      [req.params.id, date]
    );
    const bookedTimes = appointmentsResult.rows.map(r => r.appointment_time);

    // Generate time slots (8 AM - 5 PM, 30 min intervals)
    const slots = [];
    const slotStart = 8;
    const slotEnd = 17;
    for (let hour = slotStart; hour < slotEnd; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
        const isBooked = bookedTimes.some(t => t === timeStr);
        slots.push({
          time: timeStr,
          displayTime: `${hour > 12 ? hour - 12 : hour}:${String(min).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,
          available: !isBooked,
        });
      }
    }

    res.json({ slots, date });
  } catch (err) {
    console.error('Get slots error:', err);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// POST /api/doctors - admin only
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, phone, department_id, specialization, bio, available_days, consultation_fee } = req.body;
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
       VALUES ($1, $2, $3, 'doctor', $4) RETURNING id`,
      [name, email, passwordHash, phone || null]
    );

    const doctorResult = await client.query(
      `INSERT INTO doctors (user_id, department_id, specialization, bio, available_days, consultation_fee)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userResult.rows[0].id,
        department_id || null,
        specialization || null,
        bio || null,
        available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        consultation_fee || 0,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Doctor created', doctor: doctorResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create doctor error:', err);
    res.status(500).json({ error: 'Failed to create doctor' });
  } finally {
    client.release();
  }
});

// PUT /api/doctors/:id - admin only
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, phone, department_id, specialization, bio, available_days, consultation_fee, is_active } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const doctorResult = await client.query(
      `UPDATE doctors SET
        department_id = COALESCE($1, department_id),
        specialization = COALESCE($2, specialization),
        bio = COALESCE($3, bio),
        available_days = COALESCE($4, available_days),
        consultation_fee = COALESCE($5, consultation_fee),
        is_active = COALESCE($6, is_active)
       WHERE id = $7 RETURNING user_id`,
      [department_id, specialization, bio, available_days, consultation_fee, is_active, req.params.id]
    );
    if (doctorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Doctor not found' });
    }
    if (name || phone) {
      await client.query(
        'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3',
        [name, phone, doctorResult.rows[0].user_id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Doctor updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update doctor' });
  } finally {
    client.release();
  }
});

// DELETE /api/doctors/:id - admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE doctors SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Doctor deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate doctor' });
  }
});

module.exports = router;
