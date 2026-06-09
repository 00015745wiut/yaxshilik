/**
 * Multicard ("Rahmat") payment gateway client.
 *
 * Implements the minimal "payment page" integration: authenticate, create a
 * hosted-checkout invoice, look up an invoice's payment status, and verify the
 * server-to-server callback signature.
 *
 * Docs: https://docs.multicard.uz  ·  llms.txt at the repo root.
 * Amounts on the wire are in tiyin (1 UZS = 100 tiyin).
 */
const crypto = require('crypto');

const BASE_URL  = (process.env.MULTICARD_BASE_URL || 'https://dev-mesh.multicard.uz').replace(/\/+$/, '');
const APP_ID    = process.env.MULTICARD_APPLICATION_ID || 'rhmt_test';
const SECRET    = process.env.MULTICARD_SECRET || 'Pw18axeBFo8V7NamKHXX';
const STORE_ID  = process.env.MULTICARD_STORE_ID || '6';
const SEND_OFD  = process.env.MULTICARD_SEND_OFD !== 'false';
const OFD_MXIK  = process.env.MULTICARD_OFD_MXIK || '10305001001000000';
const OFD_PKG   = process.env.MULTICARD_OFD_PACKAGE_CODE || '1505101';

// In-memory token cache (single process). { token, expiresAt(ms) }
let cached = { token: null, expiresAt: 0 };

function uzsToTiyin(amountUzs) {
  return Math.round(Number(amountUzs) * 100);
}

function gatewayError(message, payload) {
  const err = new Error(message);
  err.status = 502;
  err.multicard = payload;
  return err;
}

// ── Low-level HTTP ──────────────────────────────────────────────────────────
async function call(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${await getToken()}`;

  const res  = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok || json.success === false) {
    const detail =
      json?.error?.details || json?.error?.code || json?.message || text || res.statusText;
    throw gatewayError(`Multicard ${method} ${path} failed: ${detail}`, json);
  }
  return json;
}

// ── Auth ────────────────────────────────────────────────────────────────────
async function getToken() {
  const now = Date.now();
  if (cached.token && now < cached.expiresAt - 60_000) return cached.token;

  const res  = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ application_id: APP_ID, secret: SECRET }),
  });
  const json = await res.json().catch(() => ({}));
  const data = json.data || json; // auth may or may not wrap in { data }
  const token = data.token;
  if (!res.ok || !token) {
    throw gatewayError('Multicard authentication failed', json);
  }

  // expiry is "YYYY-MM-DD HH:mm:ss" in GMT+5
  const expMs = data.expiry
    ? new Date(`${String(data.expiry).replace(' ', 'T')}+05:00`).getTime()
    : NaN;
  cached = {
    token,
    expiresAt: Number.isNaN(expMs) ? now + 5 * 60_000 : expMs,
  };
  return token;
}

// ── Invoices ────────────────────────────────────────────────────────────────
/**
 * Create a hosted-checkout invoice. Returns the gateway `data` object,
 * including `uuid` and `checkout_url`.
 */
async function createInvoice({ amountUzs, invoiceId, callbackUrl, returnUrl, returnErrorUrl, lang = 'ru', name }) {
  const amount = uzsToTiyin(amountUzs);
  const body = {
    store_id:         String(STORE_ID),
    amount,
    invoice_id:       String(invoiceId),
    callback_url:     callbackUrl,
    return_url:       returnUrl,
    return_error_url: returnErrorUrl,
    lang,
  };
  if (SEND_OFD) {
    body.ofd = [{
      qty:          1,
      price:        amount,
      total:        amount,
      mxik:         OFD_MXIK,
      package_code: OFD_PKG,
      name:         (name || 'Charity donation').slice(0, 64),
      vat:          0,
    }];
  }
  const json = await call('/payment/invoice', { method: 'POST', body });
  return json.data;
}

/** Fetch an invoice (incl. nested `payment`) by its Multicard uuid. */
async function getInvoice(uuid) {
  const json = await call(`/payment/invoice/${uuid}`, { method: 'GET' });
  return json.data;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Map a Multicard invoice to our donation status. */
function mapPaymentStatus(invoice) {
  const status = invoice?.payment?.status;
  if (status === 'success')                 return 'paid';
  if (status === 'error' || status === 'revert') return 'failed';
  return 'pending'; // draft / progress / billing / no payment yet
}

/** Verify the success-callback signature: md5(store_id + invoice_id + amount + secret). */
function verifyCallbackSign({ store_id, invoice_id, amount, sign }) {
  const expected = crypto
    .createHash('md5')
    .update(`${store_id}${invoice_id}${amount}${SECRET}`)
    .digest('hex');
  return Boolean(sign) && expected === sign;
}

module.exports = {
  createInvoice,
  getInvoice,
  mapPaymentStatus,
  verifyCallbackSign,
  uzsToTiyin,
};
