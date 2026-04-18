const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const QRCode = require('qrcode');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const demo = require('../demo-data');

// Generate queue number for a department on a given date
async function getNextQueueNumber(client, departmentId, date) {
  const result = await client.query(
    `SELECT COALESCE(MAX(queue_number), 0) + 1 as next_num
     FROM appointments
     WHERE department_id = $1 AND appointment_date = $2
     AND status != 'cancelled'`,
    [departmentId, date]
  );
  return result.rows[0].next_num;
}

// GET /api/appointments - role-based
router.get('/', authenticate, async (req, res) => {
  if (demo.demoMode) return res.json({ appointments: [], total: 0 });
  try {
    const { status, date, doctor_id, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*,
             p.card_number, pu.name as patient_name, pu.phone as patient_phone,
             du.name as doctor_name, d.specialization,
             dep.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'patient') {
      params.push(req.user.id);
      query += ` AND pu.id = $${params.length}`;
    } else if (req.user.role === 'doctor') {
      // Subquery avoids a separate round-trip
      query += ` AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = $${params.length + 1} LIMIT 1)`;
      params.push(req.user.id);
    }

    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    if (date) { params.push(date); query += ` AND a.appointment_date = $${params.length}`; }
    if (doctor_id) { params.push(doctor_id); query += ` AND a.doctor_id = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND a.department_id = $${params.length}`; }

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time ASC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ appointments: result.rows });
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET /api/appointments/today - receptionist/doctor
router.get('/today', authenticate, authorize('receptionist', 'doctor', 'admin'), async (req, res) => {
  if (demo.demoMode) return res.json({ appointments: [] });
  try {
    const today = new Date().toISOString().split('T')[0];
    const { department_id } = req.query;

    let query = `
      SELECT a.*,
             p.card_number, pu.name as patient_name, pu.phone as patient_phone,
             du.name as doctor_name, d.specialization, dep.name as department_name,
             q.status as queue_status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      LEFT JOIN queue q ON q.appointment_id = a.id
      WHERE a.appointment_date = $1
      AND a.status != 'cancelled'
    `;
    const params = [today];

    if (req.user.role === 'doctor') {
      // Use subquery to avoid separate round-trip (N+1 fix)
      query += ` AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = $2 LIMIT 1)`;
      params.push(req.user.id);
    }
    if (department_id) {
      params.push(department_id);
      query += ` AND a.department_id = $${params.length}`;
    }

    query += ' ORDER BY a.queue_number ASC';
    const result = await pool.query(query, params);
    res.json({ appointments: result.rows });
  } catch (err) {
    console.error('Get today appointments error:', err);
    res.status(500).json({ error: 'Failed to fetch today appointments' });
  }
});

// GET /api/appointments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              p.card_number, p.date_of_birth, p.gender, p.blood_type,
              pu.name as patient_name, pu.phone as patient_phone, pu.email as patient_email,
              du.name as doctor_name, d.specialization,
              dep.name as department_name,
              q.queue_number as q_number, q.status as queue_status, q.estimated_wait_minutes
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       LEFT JOIN departments dep ON a.department_id = dep.id
       LEFT JOIN queue q ON q.appointment_id = a.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// POST /api/appointments - book appointment
router.post('/', authenticate, authorize('patient', 'receptionist', 'admin'), async (req, res) => {
  const { patient_id, doctor_id, department_id, appointment_date, appointment_time, symptoms, notes } = req.body;

  if (!doctor_id || !department_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ error: 'Doctor, department, date, and time are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve patient_id
    let resolvedPatientId = patient_id;
    if (!resolvedPatientId && req.user.role === 'patient') {
      const patientResult = await client.query(
        'SELECT id FROM patients WHERE user_id = $1', [req.user.id]
      );
      if (patientResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      resolvedPatientId = patientResult.rows[0].id;
    }

    // Duplicate check: same patient + same doctor + same date (not cancelled)
    const dupCheck = await client.query(
      `SELECT id FROM appointments
       WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date = $3
       AND status != 'cancelled'`,
      [resolvedPatientId, doctor_id, appointment_date]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have an appointment with this doctor on this date' });
    }

    // Duplicate check: same patient + same date + same time (any doctor)
    const timeConflict = await client.query(
      `SELECT id FROM appointments
       WHERE patient_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status != 'cancelled'`,
      [resolvedPatientId, appointment_date, appointment_time]
    );
    if (timeConflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have an appointment at this time' });
    }

    // Check slot availability (doctor not double-booked)
    const slotConflict = await client.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status != 'cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (slotConflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
    }

    // Get queue number
    const queueNumber = await getNextQueueNumber(client, department_id, appointment_date);

    // Create appointment
    const apptResult = await client.query(
      `INSERT INTO appointments
        (patient_id, doctor_id, department_id, appointment_date, appointment_time,
         queue_number, status, symptoms, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8)
       RETURNING *`,
      [resolvedPatientId, doctor_id, department_id, appointment_date, appointment_time,
       queueNumber, symptoms || null, notes || null]
    );

    const appt = apptResult.rows[0];

    // Generate QR code data
    const qrData = JSON.stringify({
      appointmentId: appt.id,
      patientId: resolvedPatientId,
      doctorId: doctor_id,
      date: appointment_date,
      time: appointment_time,
      queue: queueNumber,
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Update appointment with QR code
    await client.query('UPDATE appointments SET qr_code = $1 WHERE id = $2', [qrCode, appt.id]);

    // Add to queue
    await client.query(
      `INSERT INTO queue (appointment_id, department_id, queue_number, status)
       VALUES ($1, $2, $3, 'waiting')`,
      [appt.id, department_id, queueNumber]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: { ...appt, qr_code: qrCode, queue_number: queueNumber },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Book appointment error:', err);
    res.status(500).json({ error: 'Failed to book appointment' });
  } finally {
    client.release();
  }
});

// PUT /api/appointments/:id/status - update status
router.put('/:id/status', authenticate, authorize('doctor', 'receptionist', 'admin'), async (req, res) => {
  const { status, diagnosis, prescription, treatment, notes, follow_up_date } = req.body;
  const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update queue status
    const queueStatus = { in_progress: 'in_progress', completed: 'completed', cancelled: 'skipped' }[status] || status;
    if (['in_progress', 'completed', 'cancelled'].includes(status)) {
      await client.query(
        `UPDATE queue SET status = $1,
          called_at = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE called_at END,
          completed_at = CASE WHEN $1 IN ('completed', 'skipped') THEN NOW() ELSE completed_at END
         WHERE appointment_id = $2`,
        [queueStatus === 'cancelled' ? 'skipped' : queueStatus, req.params.id]
      );
    }

    // If completed, create medical record
    if (status === 'completed' && (diagnosis || prescription)) {
      const appt = result.rows[0];
      const doctorResult = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      const doctorId = doctorResult.rows.length > 0 ? doctorResult.rows[0].id : appt.doctor_id;

      await client.query(
        `INSERT INTO medical_records (patient_id, appointment_id, doctor_id, diagnosis, prescription, treatment, notes, follow_up_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [appt.patient_id, appt.id, doctorId, diagnosis, prescription, treatment, notes, follow_up_date || null]
      );
    }

    await client.query('COMMIT');

    // Emit socket event
    req.app.get('io')?.emit('queue:update', { departmentId: result.rows[0].department_id });

    res.json({ message: 'Appointment status updated', appointment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update appointment status' });
  } finally {
    client.release();
  }
});

// PUT /api/appointments/:id/cancel - patient cancels
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const appt = await pool.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    if (req.user.role === 'patient') {
      const patient = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
      if (appt.rows[0].patient_id !== patient.rows[0]?.id) {
        return res.status(403).json({ error: 'Cannot cancel another patient\'s appointment' });
      }
    }

    if (['completed', 'in_progress'].includes(appt.rows[0].status)) {
      return res.status(400).json({ error: 'Cannot cancel a completed or in-progress appointment' });
    }

    await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2',
      ['cancelled', req.params.id]
    );
    await pool.query(
      "UPDATE queue SET status = 'skipped' WHERE appointment_id = $1",
      [req.params.id]
    );

    req.app.get('io')?.emit('queue:update', { departmentId: appt.rows[0].department_id });

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    console.error('Cancel appointment error:', err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

module.exports = router;
