require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const pool         = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Ensure uploads directory exists on startup ────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads/ directory');
}

// ── Security & logging ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static file serving ───────────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/cases',      require('./routes/casesRoutes'));
app.use('/api/donations',  require('./routes/donationsRoutes'));
app.use('/api/payments',   require('./routes/paymentsRoutes'));
app.use('/api/categories', require('./routes/categoriesRoutes'));
app.use('/api/stats',      require('./routes/statsRoutes'));

// ── 404 for any unknown /api/* route ─────────────────────────────────────────
app.use('/api/*path', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (err) {
      console.error('Error closing pool:', err.message);
    }
    process.exit(0);
  });

  // Force exit if server hasn't closed within 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
