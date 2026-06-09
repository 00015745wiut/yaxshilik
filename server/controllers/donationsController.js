const { validationResult } = require('express-validator');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const multicard = require('../services/multicardService');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

function generateTxRef() {
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return `TXN-${Date.now()}-${digits}`;
}

/**
 * Mark a donation as paid and credit its case — idempotent and transactional.
 * Re-running for an already-paid donation is a no-op (safe for callback retries
 * and concurrent status polls). Returns the updated donation row, or null if the
 * donation no longer exists.
 */
async function markDonationPaid(donationId, { card_pan = null, ps = null } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM donations WHERE id = $1 FOR UPDATE',
      [donationId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const donation = rows[0];
    if (donation.status === 'paid') {
      await client.query('COMMIT');
      return donation; // already credited — idempotent
    }

    const { rows: [updated] } = await client.query(
      `UPDATE donations
       SET status   = 'paid',
           paid_at  = NOW(),
           card_pan = COALESCE($2, card_pan),
           ps       = COALESCE($3, ps)
       WHERE id = $1
       RETURNING *`,
      [donationId, card_pan, ps]
    );

    // Credit the case and auto-complete it if the goal is reached.
    const { rows: caseRows } = await client.query(
      'SELECT goal_amount, raised_amount, status FROM cases WHERE id = $1 FOR UPDATE',
      [donation.case_id]
    );
    if (caseRows.length > 0) {
      const c = caseRows[0];
      const newRaised = parseFloat(c.raised_amount) + parseFloat(donation.amount);
      const newStatus =
        c.status === 'active' && newRaised >= parseFloat(c.goal_amount) ? 'completed' : c.status;

      await client.query(
        `UPDATE cases
         SET raised_amount = raised_amount + $1,
             status        = $2,
             updated_at    = NOW()
         WHERE id = $3`,
        [donation.amount, newStatus, donation.case_id]
      );
    }

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── POST /api/donations/checkout ─────────────────────────────────────────────
// Create a pending donation and a Multicard invoice; return the checkout URL.
async function createCheckout(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { case_id, amount, message } = req.body;
  const user_id = req.user.id;

  const { rows: caseRows } = await pool.query(
    'SELECT id, title, status FROM cases WHERE id = $1',
    [case_id]
  );
  if (caseRows.length === 0) {
    return res.status(400).json({ error: 'Case not found' });
  }
  if (caseRows[0].status !== 'active') {
    return res.status(400).json({ error: 'Donations are only accepted for active cases' });
  }

  const transaction_ref = generateTxRef();

  const { rows: [donation] } = await pool.query(
    `INSERT INTO donations (user_id, case_id, amount, message, transaction_ref, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [user_id, case_id, amount, message ?? null, transaction_ref]
  );

  try {
    const invoice = await multicard.createInvoice({
      amountUzs:      amount,
      invoiceId:      transaction_ref,
      callbackUrl:    `${SERVER_URL}/api/payments/callback`,
      returnUrl:      `${CLIENT_URL}/donations/return?donation=${donation.id}`,
      returnErrorUrl: `${CLIENT_URL}/donations/return?donation=${donation.id}&status=failed`,
      name:           caseRows[0].title,
    });

    await pool.query(
      'UPDATE donations SET invoice_uuid = $1 WHERE id = $2',
      [invoice.uuid, donation.id]
    );

    return res.status(201).json({
      donation_id:  donation.id,
      invoice_uuid: invoice.uuid,
      checkout_url: invoice.checkout_url,
    });
  } catch (err) {
    // Don't leave a dangling pending row if the gateway rejected us.
    await pool.query("UPDATE donations SET status = 'failed' WHERE id = $1", [donation.id]);
    console.error('createCheckout error:', err.message, err.multicard ?? '');
    return res.status(502).json({ error: 'Could not start the payment. Please try again.' });
  }
}

// ── GET /api/donations/:id/status ────────────────────────────────────────────
// Owner-only. If still pending, reconcile against Multicard (polling fallback
// for environments where the callback can't reach us, e.g. localhost).
async function getDonationStatus(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT d.*, c.title AS case_title, c.image_url AS case_image_url
     FROM donations d
     JOIN cases c ON c.id = d.case_id
     WHERE d.id = $1`,
    [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Donation not found' });
  }

  let donation = rows[0];
  if (donation.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (donation.status === 'pending' && donation.invoice_uuid) {
    try {
      const invoice = await multicard.getInvoice(donation.invoice_uuid);
      const mapped  = multicard.mapPaymentStatus(invoice);

      if (mapped === 'paid') {
        const payment = invoice.payment || {};
        const updated = await markDonationPaid(donation.id, {
          card_pan: payment.card_pan || null,
          ps:       payment.ps || null,
        });
        donation = { ...donation, ...updated };
      } else if (mapped === 'failed') {
        const { rows: [u] } = await pool.query(
          "UPDATE donations SET status = 'failed' WHERE id = $1 RETURNING *",
          [donation.id]
        );
        donation = { ...donation, ...u };
      }
    } catch (err) {
      // Network/gateway hiccup — leave as pending; the client keeps polling.
      console.error('getDonationStatus poll error:', err.message);
    }
  }

  return res.json({
    id:              donation.id,
    status:          donation.status,
    amount:          donation.amount,
    message:         donation.message,
    transaction_ref: donation.transaction_ref,
    created_at:      donation.created_at,
    paid_at:         donation.paid_at,
    case_id:         donation.case_id,
    case_title:      donation.case_title,
  });
}

// ── POST /api/payments/callback ──────────────────────────────────────────────
// Server-to-server callback from Multicard. Public (no JWT); authenticated by
// the request signature. Must return { success: true } on acceptance.
async function handlePaymentCallback(req, res) {
  const body = req.body || {};
  const { invoice_id, amount, card_pan, ps } = body;

  if (!multicard.verifyCallbackSign(body)) {
    console.warn('Multicard callback rejected: invalid signature for invoice', invoice_id);
    return res.status(400).json({ success: false });
  }

  const { rows } = await pool.query(
    'SELECT * FROM donations WHERE transaction_ref = $1',
    [invoice_id]
  );
  if (rows.length === 0) {
    console.warn('Multicard callback: unknown invoice', invoice_id);
    return res.status(404).json({ success: false });
  }
  const donation = rows[0];

  // Guard against amount tampering (callback amount is in tiyin).
  if (multicard.uzsToTiyin(donation.amount) !== Number(amount)) {
    console.warn('Multicard callback: amount mismatch for invoice', invoice_id);
    return res.status(400).json({ success: false });
  }

  await markDonationPaid(donation.id, { card_pan, ps });
  return res.json({ success: true });
}

// ── GET /api/donations/my ────────────────────────────────────────────────────
async function getMyDonations(req, res) {
  const { rows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.transaction_ref, d.created_at,
            c.id AS case_id, c.title AS case_title,
            c.image_url AS case_image_url, c.status AS case_status
     FROM donations d
     JOIN cases c ON c.id = d.case_id
     WHERE d.user_id = $1 AND d.status = 'paid'
     ORDER BY d.created_at DESC`,
    [req.user.id]
  );
  return res.json(rows);
}

// ── GET /api/donations/case/:caseId  (admin) ─────────────────────────────────
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
     WHERE d.case_id = $1 AND d.status = 'paid'
     ORDER BY d.created_at DESC`,
    [caseId]
  );
  return res.json(rows);
}

// ── GET /api/donations/my/stats ──────────────────────────────────────────────
async function getMyStats(req, res) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(amount), 0)       AS total_donated,
       COUNT(*)                        AS total_donations,
       COUNT(DISTINCT case_id)         AS unique_cases
     FROM donations
     WHERE user_id = $1 AND status = 'paid'`,
    [req.user.id]
  );

  const raw = rows[0];
  return res.json({
    total_donated:    parseFloat(raw.total_donated),
    total_donations:  parseInt(raw.total_donations),
    unique_cases:     parseInt(raw.unique_cases),
  });
}

// ── GET /api/donations/recent  (admin) ───────────────────────────────────────
async function getRecentDonations(req, res) {
  const { rows } = await pool.query(
    `SELECT d.id, d.amount, d.message, d.transaction_ref, d.created_at,
            u.full_name AS donor_name,
            c.id AS case_id, c.title AS case_title
     FROM donations d
     LEFT JOIN users  u ON u.id = d.user_id
     LEFT JOIN cases  c ON c.id = d.case_id
     WHERE d.status = 'paid'
     ORDER BY d.created_at DESC
     LIMIT 20`
  );
  return res.json(rows);
}

module.exports = {
  createCheckout:      asyncHandler(createCheckout),
  getDonationStatus:   asyncHandler(getDonationStatus),
  handlePaymentCallback: asyncHandler(handlePaymentCallback),
  getMyDonations:      asyncHandler(getMyDonations),
  getDonationsByCase:  asyncHandler(getDonationsByCase),
  getMyStats:          asyncHandler(getMyStats),
  getRecentDonations:  asyncHandler(getRecentDonations),
};
