const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { PROOF_FIELDS } = require('../middleware/upload');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Flatten multer .fields() proof uploads into [{ type, file_url }].
function collectProofs(files) {
  const out = [];
  if (!files) return out;
  for (const [field, type] of Object.entries(PROOF_FIELDS)) {
    for (const f of files[field] || []) {
      out.push({ type, file_url: `/uploads/${f.filename}` });
    }
  }
  return out;
}

async function insertProofs(client, caseId, proofs) {
  for (const p of proofs) {
    await client.query(
      'INSERT INTO case_proofs (case_id, type, file_url) VALUES ($1, $2, $3)',
      [caseId, p.type, p.file_url]
    );
  }
}

async function getProofs(caseId) {
  const { rows } = await pool.query(
    `SELECT id, type, file_url, caption, created_at
     FROM case_proofs
     WHERE case_id = $1
     ORDER BY
       CASE type WHEN 'document' THEN 0 WHEN 'photo' THEN 1 ELSE 2 END,
       created_at`,
    [caseId]
  );
  return rows;
}

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
    `SELECT c.*, cat.name AS category_name,
            (SELECT COUNT(*) FROM case_proofs p WHERE p.case_id = c.id) AS proof_count
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
     WHERE d.case_id = $1 AND d.status = 'paid'
     ORDER BY d.created_at DESC
     LIMIT 10`,
    [id]
  );

  const proofs = await getProofs(id);

  return res.json({ ...caseRows[0], recent_donations: donationRows, proofs });
}

async function createCase(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { title, description, category_id, goal_amount } = req.body;
  const image_url = req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : null;
  const proofs = collectProofs(req.files);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [created] } = await client.query(
      `INSERT INTO cases (title, description, image_url, goal_amount, category_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, image_url, goal_amount, category_id, req.user.id]
    );
    await insertProofs(client, created.id, proofs);
    await client.query('COMMIT');

    return res.status(201).json({ ...created, proofs: await getProofs(created.id) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
  const image_url = req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : current.image_url;
  const proofs = collectProofs(req.files);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [updated] } = await client.query(
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
    await insertProofs(client, id, proofs); // append any newly uploaded proofs
    await client.query('COMMIT');

    return res.json({ ...updated, proofs: await getProofs(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// DELETE /api/cases/:id/proofs/:proofId  (admin)
async function deleteCaseProof(req, res) {
  const { id, proofId } = req.params;

  const { rows } = await pool.query(
    'SELECT file_url FROM case_proofs WHERE id = $1 AND case_id = $2',
    [proofId, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Proof not found' });
  }

  await pool.query('DELETE FROM case_proofs WHERE id = $1', [proofId]);

  // Best-effort removal of the file on disk (ignore if missing).
  const fileName = path.basename(rows[0].file_url);
  fs.unlink(path.join(UPLOADS_DIR, fileName), () => {});

  return res.json({ message: 'Proof removed' });
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
    pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations WHERE status = 'paid'`),
    pool.query(`SELECT COUNT(DISTINCT user_id) AS total FROM donations WHERE status = 'paid'`),
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
  createCase:      asyncHandler(createCase),
  updateCase:      asyncHandler(updateCase),
  deleteCase:      asyncHandler(deleteCase),
  deleteCaseProof: asyncHandler(deleteCaseProof),
  getAdminStats:   asyncHandler(getAdminStats),
};
