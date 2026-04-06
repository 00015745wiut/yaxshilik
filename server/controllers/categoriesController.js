const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

async function getAllCategories(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM categories ORDER BY name ASC'
  );
  return res.json(rows);
}

module.exports = { getAllCategories: asyncHandler(getAllCategories) };
