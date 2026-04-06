const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

function generateTxRef() {
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `TXN-${Date.now()}-${digits}`;
}

// POST /api/donations
async function createDonation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { case_id, amount, message } = req.body;
  const user_id = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check case exists and is active
    const { rows: caseRows } = await client.query(
      `SELECT id, goal_amount, raised_amount, status FROM cases WHERE id = $1 FOR UPDATE`,
      [case_id]
    );

    if (caseRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Case not found' });
    }
    if (caseRows[0].status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Donations are only accepted for active cases' });
    }

    const { goal_amount, raised_amount } = caseRows[0];
    const transaction_ref = generateTxRef();

    // 2. Insert donation
    const { rows: [donation] } = await client.query(
      `INSERT INTO donations (user_id, case_id, amount, message, transaction_ref)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, case_id, amount, message ?? null, transaction_ref]
    );

    // 3 & 4. Update raised_amount; complete case if goal reached
    const newRaised = parseFloat(raised_amount) + parseFloat(amount);
    const newStatus = newRaised >= parseFloat(goal_amount) ? 'completed' : 'active';

    await client.query(
      `UPDATE cases
       SET raised_amount = raised_amount + $1,
           status        = $2,
           updated_at    = NOW()
       WHERE id = $3`,
      [amount, newStatus, case_id]
    );

    // 5. Commit
    await client.query('COMMIT');
    return res.status(201).json(donation);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createDonation error:', err.message);
    return res.status(500).json({ error: 'Donation failed, please try again' });
  } finally {
    client.release();
  }
}

// GET /api/donations/my
async function getMyDonations(req, res) {
  const { rows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.transaction_ref, d.created_at,
            c.id AS case_id, c.title AS case_title,
            c.image_url AS case_image_url, c.status AS case_status
     FROM donations d
     JOIN cases c ON c.id = d.case_id
     WHERE d.user_id = $1
     ORDER BY d.created_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
}

// GET /api/donations/case/:caseId  (admin)
async function getDonationsByCase(req, res) {
  const { caseId } = req.params;

  const { rows: caseCheck } = await pool.query(
    'SELECT id FROM cases WHERE id = $1',
    [caseId]
  );
  if (caseCheck.length === 0) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { rows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.transaction_ref, d.created_at,
            u.full_name AS donor_name
     FROM donations d
     LEFT JOIN users u ON u.id = d.user_id
     WHERE d.case_id = $1
     ORDER BY d.created_at DESC`,
    [caseId]
  );
  return res.json(rows);
}

// GET /api/donations/my/stats
async function getMyStats(req, res) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0)       AS total_donated,
       COUNT(*)                        AS total_donations,
       COUNT(DISTINCT case_id)         AS unique_cases
     FROM donations
     WHERE user_id = $1`,
    [req.user.id]
  );

  const raw = rows[0];
  return res.json({
    total_donated:    parseFloat(raw.total_donated),
    total_donations:  parseInt(raw.total_donations),
    unique_cases:     parseInt(raw.unique_cases),
  });
}

// GET /api/donations/recent  (admin)
async function getRecentDonations(req, res) {
  const { rows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.transaction_ref, d.created_at,
            u.full_name AS donor_name,
            c.id AS case_id, c.title AS case_title
     FROM donations d
     LEFT JOIN users  u ON u.id = d.user_id
     LEFT JOIN cases  c ON c.id = d.case_id
     ORDER BY d.created_at DESC
     LIMIT 20`
  );
  return res.json(rows);
}

module.exports = {
  createDonation:     asyncHandler(createDonation),
  getMyDonations:     asyncHandler(getMyDonations),
  getDonationsByCase: asyncHandler(getDonationsByCase),
  getMyStats:         asyncHandler(getMyStats),
  getRecentDonations: asyncHandler(getRecentDonations),
};
