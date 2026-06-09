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
        status          VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed')),
        invoice_uuid    VARCHAR(100),
        card_pan        VARCHAR(32),
        ps              VARCHAR(20),
        paid_at         TIMESTAMP,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ✓ donations');

    // Payment columns (idempotent — also upgrades pre-existing donations tables).
    // Default 'paid' so legacy/seed rows count as completed; the checkout flow
    // inserts new rows as 'pending' until the payment provider confirms them.
    await client.query(`
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS status       VARCHAR(20) DEFAULT 'paid';
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS invoice_uuid VARCHAR(100);
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS card_pan     VARCHAR(32);
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS ps           VARCHAR(20);
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMP;
    `);
    console.log('  ✓ donations payment columns');

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_donations_user_id     ON donations(user_id);
      CREATE INDEX IF NOT EXISTS idx_donations_case_id     ON donations(case_id);
      CREATE INDEX IF NOT EXISTS idx_cases_category_id     ON cases(category_id);
      CREATE INDEX IF NOT EXISTS idx_cases_status          ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_donations_status      ON donations(status);
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
