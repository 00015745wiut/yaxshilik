const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// GET /api/stats/public  — no auth required
router.get('/public', async (req, res, next) => {
  try {
    const [activeCases, raisedSum, donors] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM cases WHERE status = 'active'`),
      pool.query(`
        SELECT COALESCE(SUM(raised_amount), 0) AS total
        FROM cases
        WHERE status IN ('active', 'completed')
      `),
      pool.query(`SELECT COUNT(DISTINCT user_id) AS total FROM donations WHERE status = 'paid'`),
    ]);

    res.json({
      total_active_cases: parseInt(activeCases.rows[0].total),
      total_raised:       parseFloat(raisedSum.rows[0].total),
      total_donors:       parseInt(donors.rows[0].total),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
