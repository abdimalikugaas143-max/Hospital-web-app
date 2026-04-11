const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// GET /api/departments - public
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, COUNT(doc.id) as doctor_count
       FROM departments d
       LEFT JOIN doctors doc ON doc.department_id = d.id AND doc.is_active = true
       WHERE d.is_active = true
       GROUP BY d.id
       ORDER BY d.name`
    );
    res.json({ departments: result.rows });
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET /api/departments/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ department: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// POST /api/departments - admin only
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json({ message: 'Department created', department: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department name already exists' });
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /api/departments/:id - admin only
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, description, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE departments SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, description, is_active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated', department: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id - admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE departments SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Department deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;
