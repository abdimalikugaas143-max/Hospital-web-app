const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// GET /api/reports/stats - admin dashboard stats
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalPatients, totalDoctors, todayAppointments, totalAppointments, deptStats] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM patients"),
      pool.query("SELECT COUNT(*) FROM doctors WHERE is_active = true"),
      pool.query("SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status != 'cancelled'", [today]),
      pool.query("SELECT COUNT(*) FROM appointments WHERE status != 'cancelled'"),
      pool.query(`
        SELECT dep.name, COUNT(a.id) as appointment_count
        FROM departments dep
        LEFT JOIN appointments a ON a.department_id = dep.id AND a.status != 'cancelled'
        WHERE dep.is_active = true
        GROUP BY dep.id, dep.name
        ORDER BY appointment_count DESC
        LIMIT 5
      `),
    ]);

    // Appointments by status today
    const statusStats = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointments
       WHERE appointment_date = $1
       GROUP BY status`,
      [today]
    );

    // Weekly appointment trend (last 7 days)
    const weeklyTrend = await pool.query(
      `SELECT appointment_date::text as date, COUNT(*) as count
       FROM appointments
       WHERE appointment_date >= NOW() - INTERVAL '7 days'
       AND status != 'cancelled'
       GROUP BY appointment_date
       ORDER BY appointment_date`
    );

    res.json({
      stats: {
        totalPatients: parseInt(totalPatients.rows[0].count),
        totalDoctors: parseInt(totalDoctors.rows[0].count),
        todayAppointments: parseInt(todayAppointments.rows[0].count),
        totalAppointments: parseInt(totalAppointments.rows[0].count),
      },
      departmentStats: deptStats.rows,
      statusStats: statusStats.rows,
      weeklyTrend: weeklyTrend.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/reports/appointments - appointment report
router.get('/appointments', authenticate, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { start_date, end_date, department_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.queue_number,
             pu.name as patient_name, p.card_number, pu.phone as patient_phone,
             du.name as doctor_name, dep.name as department_name,
             a.created_at
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      LEFT JOIN departments dep ON a.department_id = dep.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) { params.push(start_date); query += ` AND a.appointment_date >= $${params.length}`; }
    if (end_date) { params.push(end_date); query += ` AND a.appointment_date <= $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND a.department_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }

    const countQuery = query.replace(
      /SELECT.*?FROM appointments/s,
      'SELECT COUNT(*) FROM appointments'
    );
    const countResult = await pool.query(countQuery.split('ORDER BY')[0], params);

    query += ` ORDER BY a.appointment_date DESC, a.appointment_time ASC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({
      appointments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Appointment report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// GET /api/reports/doctors - doctor performance
router.get('/doctors', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = end_date || today;

    const result = await pool.query(
      `SELECT u.name as doctor_name, d.specialization, dep.name as department_name,
              COUNT(a.id) FILTER (WHERE a.status != 'cancelled') as total_appointments,
              COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed,
              COUNT(a.id) FILTER (WHERE a.status = 'cancelled') as cancelled
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN departments dep ON d.department_id = dep.id
       LEFT JOIN appointments a ON a.doctor_id = d.id
         AND a.appointment_date BETWEEN $1 AND $2
       WHERE d.is_active = true
       GROUP BY d.id, u.name, d.specialization, dep.name
       ORDER BY total_appointments DESC`,
      [start, end]
    );
    res.json({ doctors: result.rows, period: { start, end } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate doctor report' });
  }
});

module.exports = router;
