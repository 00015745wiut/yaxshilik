const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSortClause(sort) {
  switch (sort) {
    case 'most_funded':    return 'ORDER BY c.raised_amount DESC';
    case 'closest_to_goal': return "ORDER BY (c.goal_amount - c.raised_amount) ASC";
    default:               return 'ORDER BY c.created_at DESC'; // newest
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

async function getAllCases(req, res) {
  const { category_id, sort, search } = req.query;

  const conditions = ["c.status != 'closed'"];
  const values = [];

  if (category_id) {
    values.push(category_id);
    conditions.push(`c.category_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(c.title ILIKE $${values.length} OR c.description ILIKE $${values.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const order = buildSortClause(sort);

  const { rows } = await pool.query(
    `SELECT c.*, cat.name AS category_name
     FROM cases c
     LEFT JOIN categories cat ON cat.id = c.category_id
     ${where}
     ${order}`,
    values
  );

  return res.json(rows);
}

async function getCaseById(req, res) {
  const { id } = req.params;

  const { rows: caseRows } = await pool.query(
    `SELECT c.*, cat.name AS category_name
     FROM cases c
     LEFT JOIN categories cat ON cat.id = c.category_id
     WHERE c.id = $1`,
    [id]
  );

  if (caseRows.length === 0) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { rows: donationRows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.created_at, u.full_name AS donor_name
     FROM donations d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.case_id = $1
     ORDER BY d.created_at DESC
     LIMIT 10`,
    [id]
  );

  return res.json({ ...caseRows[0], recent_donations: donationRows });
}

async function createCase(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { title, description, category_id, goal_amount } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const { rows: [created] } = await pool.query(
    `INSERT INTO cases (title, description, image_url, goal_amount, category_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description, image_url, goal_amount, category_id, req.user.id]
  );

  return res.status(201).json(created);
}

async function updateCase(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { id } = req.params;

  const { rows: existing } = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const current = existing[0];
  const { title, description, category_id, goal_amount, status } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : current.image_url;

  const { rows: [updated] } = await pool.query(
    `UPDATE cases
     SET title       = $1,
         description = $2,
         category_id = $3,
         goal_amount = $4,
         status      = $5,
         image_url   = $6,
         updated_at  = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      title       ?? current.title,
      description ?? current.description,
      category_id ?? current.category_id,
      goal_amount ?? current.goal_amount,
      status      ?? current.status,
      image_url,
      id,
    ]
  );

  return res.json(updated);
}

async function deleteCase(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query('SELECT id FROM cases WHERE id = $1', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Case not found' });
  }

  await pool.query(
    `UPDATE cases SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );

  return res.json({ message: 'Case closed successfully' });
}

async function getAdminStats(req, res) {
  const [activeCases, completedCases, donationStats, donorCount, recentCases] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM cases WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*) AS total FROM cases WHERE status = 'completed'`),
    pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations`),
    pool.query(`SELECT COUNT(DISTINCT user_id) AS total FROM donations`),
    pool.query(
      `SELECT c.id, c.title, c.status, c.raised_amount, c.goal_amount, c.updated_at,
              cat.name AS category_name
       FROM cases c
       LEFT JOIN categories cat ON cat.id = c.category_id
       ORDER BY c.updated_at DESC
       LIMIT 5`
    ),
  ]);

  return res.json({
    total_active_cases:     parseInt(activeCases.rows[0].total),
    total_completed_cases:  parseInt(completedCases.rows[0].total),
    total_donations_sum:    parseFloat(donationStats.rows[0].total),
    total_donors:           parseInt(donorCount.rows[0].total),
    recent_cases:           recentCases.rows,
  });
}

module.exports = {
  getAllCases:    asyncHandler(getAllCases),
  getCaseById:   asyncHandler(getCaseById),
  createCase:    asyncHandler(createCase),
  updateCase:    asyncHandler(updateCase),
  deleteCase:    asyncHandler(deleteCase),
  getAdminStats: asyncHandler(getAdminStats),
};
