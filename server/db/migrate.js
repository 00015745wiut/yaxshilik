require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        full_name     VARCHAR(100) NOT NULL,
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20) DEFAULT 'donor' CHECK (role IN ('donor', 'admin')),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ users');

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );
    `);
    console.log('  ✓ categories');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id            SERIAL PRIMARY KEY,
        title         VARCHAR(200) NOT NULL,
        description   TEXT NOT NULL,
        image_url     VARCHAR(500),
        goal_amount   DECIMAL(12,2) NOT NULL CHECK (goal_amount > 0),
        raised_amount DECIMAL(12,2) DEFAULT 0 CHECK (raised_amount >= 0),
        category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
        created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ cases');

    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
        case_id         INTEGER REFERENCES cases(id) ON DELETE CASCADE,
        amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
        message         TEXT,
        transaction_ref VARCHAR(100) UNIQUE NOT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ donations');

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_donations_user_id     ON donations(user_id);
      CREATE INDEX IF NOT EXISTS idx_donations_case_id     ON donations(case_id);
      CREATE INDEX IF NOT EXISTS idx_cases_category_id     ON cases(category_id);
      CREATE INDEX IF NOT EXISTS idx_cases_status          ON cases(status);
    `);
    console.log('  ✓ indexes');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
