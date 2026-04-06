const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function formatUser(row) {
  return { id: row.id, full_name: row.full_name, email: row.email, role: row.role };
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { full_name, email, password } = req.body;

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'donor')
     RETURNING id, full_name, email, role`,
    [full_name, email, password_hash]
  );

  const token = generateToken(user);
  return res.status(201).json({ token, user: formatUser(user) });
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  const { rows } = await pool.query(
    'SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  return res.json({ token, user: formatUser(user) });
}

async function getMe(req, res) {
  const { rows } = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json(rows[0]);
}

module.exports = {
  register: asyncHandler(register),
  login:    asyncHandler(login),
  getMe:    asyncHandler(getMe),
};
