const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// GET /api/queue/today - get today's queue
router.get('/today', authenticate, authorize('receptionist', 'doctor', 'admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { department_id } = req.query;

    let query = `
      SELECT q.*, a.appointment_time, a.status as appointment_status, a.symptoms,
             a.patient_id,
             p.card_number, pu.name as patient_name, pu.phone as patient_phone,
             du.name as doctor_name, d.specialization, dep.name as department_name
      FROM queue q
      JOIN appointments a ON q.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN departments dep ON q.department_id = dep.id
      WHERE a.appointment_date = $1
      AND q.status NOT IN ('skipped')
    `;
    const params = [today];

    if (req.user.role === 'doctor') {
      // Subquery avoids a separate round-trip (N+1 fix)
      query += ` AND a.doctor_id = (SELECT id FROM doctors WHERE user_id = $2 LIMIT 1)`;
      params.push(req.user.id);
    }
    if (department_id) {
      params.push(department_id);
      query += ` AND q.department_id = $${params.length}`;
    }

    query += ' ORDER BY q.queue_number ASC';
    const result = await pool.query(query, params);

    // Calculate estimated wait times
    const waitingCount = result.rows.filter(r => r.status === 'waiting').length;
    const rows = result.rows.map((row, idx) => ({
      ...row,
      estimated_wait_minutes: row.status === 'waiting' ? idx * 15 : 0,
    }));

    res.json({ queue: rows, totalWaiting: waitingCount });
  } catch (err) {
    console.error('Get queue error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// PUT /api/queue/:id/call - call next patient
router.put('/:id/call', authenticate, authorize('receptionist', 'doctor', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE queue SET status = 'called', called_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Queue entry not found' });

    await pool.query(
      "UPDATE appointments SET status = 'in_progress' WHERE id = $1",
      [result.rows[0].appointment_id]
    );

    req.app.get('io')?.to(`dept_${result.rows[0].department_id}`).emit('queue:update', {
      action: 'called',
      queueEntry: result.rows[0],
    });

    res.json({ message: 'Patient called', queueEntry: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to call patient' });
  }
});

// PUT /api/queue/:id/complete - complete queue entry
router.put('/:id/complete', authenticate, authorize('doctor', 'receptionist', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE queue SET status = 'completed', completed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Queue entry not found' });

    await pool.query(
      "UPDATE appointments SET status = 'completed' WHERE id = $1",
      [result.rows[0].appointment_id]
    );

    req.app.get('io')?.to(`dept_${result.rows[0].department_id}`).emit('queue:update', {
      action: 'completed',
      queueEntry: result.rows[0],
    });

    res.json({ message: 'Queue entry completed', queueEntry: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete queue entry' });
  }
});

// GET /api/queue/stats - queue stats for dashboard
router.get('/stats', authenticate, authorize('receptionist', 'admin', 'doctor'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE q.status = 'waiting') as waiting,
        COUNT(*) FILTER (WHERE q.status = 'called') as called,
        COUNT(*) FILTER (WHERE q.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE q.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE q.status = 'skipped') as skipped,
        COUNT(*) as total
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       WHERE a.appointment_date = $1`,
      [today]
    );
    res.json({ stats: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

module.exports = router;
