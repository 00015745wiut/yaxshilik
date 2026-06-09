# CLAUDE.md

Guidance for working in this repository.

## Project

**Yaxshilik.uz** — a full-stack charity donation platform connecting donors with verified charity cases across Uzbekistan. Donors browse cases, contribute any amount, track their donation history, and print receipts. Admins create, edit, and manage cases through a dedicated panel.

**Stack:** React 19 + Vite 8 · Tailwind CSS v4 · Express 5 · PostgreSQL (`pg`) · JWT auth.

Monorepo with two npm workspaces driven from the root via `concurrently`:
- [client/](client/) — React + Vite SPA frontend
- [server/](server/) — Express REST API + PostgreSQL

## Commands

Run all from the repository root unless noted.

| Command | What it does |
|---------|--------------|
| `npm run install:all` | Install server + client deps (root deps are just `concurrently`) |
| `npm run dev` | Run server (port 5000) and client (port 5173) together with hot reload |
| `npm run dev:server` | Express + nodemon only |
| `npm run dev:client` | Vite dev server only |
| `npm run db:setup` | First-time DB: migrate then seed |
| `npm run db:migrate` | Create tables + indexes ([server/db/migrate.js](server/db/migrate.js)) |
| `npm run db:seed` | Insert demo users/categories/cases/donations ([server/db/seed.js](server/db/seed.js)) |
| `npm run db:reset` | Drop/recreate tables, then seed |
| `npm run db:placeholders` | Generate `case-1.svg`…`case-6.svg` into `server/uploads/` |
| `npm run build` | Build client to `client/dist/` |
| `cd client && npm run lint` | ESLint the client |

There is **no test suite** — `server` `npm test` is a placeholder that exits 1.

## Environment

`server/.env` (copy from [server/.env.example](server/.env.example)):
```
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/yaxshilik
JWT_SECRET=<long random string>
CLIENT_URL=http://localhost:5173
NODE_ENV=production   # optional; toggles error verbosity + morgan format
```

`client/.env` holds a `VITE_STRIPE_PUBLISHABLE_KEY` (Vite env vars must be prefixed `VITE_`).

Demo accounts (from seed): admin `admin@yaxshilik.uz` / `Admin123!`, donor `donor@yaxshilik.uz` / `Donor123!`.

## Architecture

### Backend ([server/](server/))

CommonJS (`require`/`module.exports`), Express 5. Layering: `routes → middleware → controllers → pg pool`.

- **[server/server.js](server/server.js)** — app bootstrap. Order: helmet (with `crossOriginResourcePolicy: cross-origin` so uploaded images load), morgan, CORS (origin = `CLIENT_URL`), JSON/urlencoded body parsing, static `/uploads`, `/api/health`, mounts route modules, `/api/*` 404, then the global error handler **last**. Has graceful SIGTERM/SIGINT shutdown that closes the pg pool.
- **[server/config/db.js](server/config/db.js)** — single shared `pg` `Pool` exported as `pool`; everything imports this.
- **Controllers** ([server/controllers/](server/controllers/)) — every exported handler is wrapped in `asyncHandler` ([server/utils/asyncHandler.js](server/utils/asyncHandler.js)) so thrown errors reach the error middleware. Use parameterized queries (`$1, $2…`) — never string interpolation. Multi-step writes use an explicit `pool.connect()` client with `BEGIN`/`COMMIT`/`ROLLBACK` (see `markDonationPaid`, which `SELECT … FOR UPDATE`s the donation and case rows to credit a paid donation atomically).
- **Middleware** ([server/middleware/](server/middleware/)):
  - `auth.js` — `authenticate` reads `Bearer` token, verifies JWT, sets `req.user = { id, role }`; `authorizeAdmin` requires `req.user.role === 'admin'`.
  - `upload.js` — multer disk storage to `uploads/`, accepts JPEG/PNG/WebP, 5 MB limit, filename `${Date.now()}-${safe}`.
  - `errorHandler.js` — central error formatter. Maps multer size errors, file-type errors, JWT errors, and pg unique-violation (`23505` → 409). In dev it returns the message + stack; in production a generic message.
- **Validation** lives in the route files using `express-validator` (`body`/`param`). Controllers call `validationResult(req)` and return `422 { errors }` when invalid. Auth login is rate-limited (15 attempts / 15 min) via `express-rate-limit`.

### Database schema ([server/db/migrate.js](server/db/migrate.js))

- `users` (id, full_name, email UNIQUE, password_hash, role `donor|admin`, created_at)
- `categories` (id, name UNIQUE, description)
- `cases` (id, title, description, image_url, goal_amount, raised_amount, category_id → categories, status `active|completed|closed`, created_by → users, timestamps)
- `donations` (id, user_id → users, case_id → cases ON DELETE CASCADE, amount, message, transaction_ref UNIQUE, created_at)

Donating updates `cases.raised_amount`; when it reaches `goal_amount` the case auto-flips to `completed`. Deleting a case is a soft-delete (`status = 'closed'`). Money is `DECIMAL(12,2)`; controllers `parseFloat`/`parseInt` pg's string results before returning JSON.

### Frontend ([client/](client/))

React 19, ESM, function components + hooks, React Router v7, Tailwind v4 (via `@tailwindcss/vite`, configured in [client/vite.config.js](client/vite.config.js) — no `tailwind.config.js`).

- **[client/src/App.jsx](client/src/App.jsx)** — provider/route tree: `ErrorBoundary → BrowserRouter → AuthProvider → ToastProvider → Layout → Routes`. Admin routes are wrapped in `<ProtectedRoute requireAdmin>`, the donor dashboard in `<ProtectedRoute denyAdmin>`.
- **[client/src/services/](client/src/services/)** — one module per resource (`auth`, `cases`, `donations`, `categories`, `stats`), each a thin object of functions returning axios promises. All go through [client/src/services/api.js](client/src/services/api.js), which sets `baseURL` and **attaches the JWT from `localStorage` on every request** and **redirects to `/login` on any 401**.
- **[client/src/context/AuthContext.jsx](client/src/context/AuthContext.jsx)** — `useAuth()` exposes `user`, `token`, `loading`, `login`, `register`, `logout`, `isAdmin`. Token persists in `localStorage`; validated via `getMe()` on mount.
- **`ToastContext`** — app-wide toast notifications.
- **[client/src/utils/format.js](client/src/utils/format.js)** — `formatCurrency` (space-separated thousands + ` UZS`), `formatNumber`, `formatDate`, `formatDateTime`, `timeAgo`. Use these for all money/date display.
- **pages/** are route-level; **components/** are reusable (incl. `Layout/`).

## API surface

Base path `/api`. See README for the full table. Auth tiers: **—** public, **Bearer** any logged-in user, **Admin** admin only.

- `auth`: `POST /register`, `POST /login`, `GET /me`
- `cases`: `GET /` (filter `category_id`, `sort`=`most_funded|closest_to_goal|newest`, `search`), `GET /:id`, `POST /` (admin, multipart `image`), `PUT /:id` (admin), `DELETE /:id` (admin soft-close), `GET /admin/stats` (admin)
- `donations`: `POST /checkout` (Bearer — start a payment), `GET /:id/status` (Bearer owner — poll/reconcile), `GET /my`, `GET /my/stats`, `GET /recent` (admin), `GET /case/:caseId` (admin)
- `payments`: `POST /callback` (public, signature-verified — Multicard server-to-server)
- `categories`: `GET /`
- `stats`: `GET /public`
- `health`: `GET /api/health`

## Conventions

- Backend is **CommonJS**; frontend is **ESM**. Don't mix.
- Keep validation in route files, business logic in controllers, all DB access through the shared `pool`.
- New controller handlers must be wrapped in `asyncHandler` before export.
- Use parameterized SQL only. Wrap multi-statement writes in a transaction.
- 2-space indentation; aligned column-style assignments and import lists are the house style across both halves.
- Image URLs are stored as `/uploads/<file>` and served statically; the client prefixes the server origin when rendering.

## Payments (Multicard / "Rahmat")

Donations are charged through the **Multicard** hosted-checkout gateway (Uzbek processor; sandbox `dev-mesh.multicard.uz`). [llms.txt](llms.txt) is the gateway's API reference; full docs at https://docs.multicard.uz.

**Flow:**
1. Donor confirms → `POST /api/donations/checkout` inserts a `pending` donation (no money credited yet), calls Multicard `/auth` + `/payment/invoice`, stores the returned `invoice_uuid`, and returns `{ donation_id, checkout_url }`.
2. The browser redirects to `checkout_url` (Multicard's hosted page). Sandbox test card: **8600 5333 6409 8829**, exp **28/06**, OTP **112233**.
3. Multicard redirects the donor back to `${CLIENT_URL}/donations/return?donation=<id>` → [PaymentReturnPage](client/src/pages/PaymentReturnPage.jsx).
4. Confirmation happens **two ways**, whichever lands first:
   - **Callback** ([POST /api/payments/callback](server/routes/paymentsRoutes.js)) — server-to-server, verified by `md5(store_id + invoice_id + amount + secret)`. Production path; **unreachable on localhost.**
   - **Polling** — the return page polls `GET /api/donations/:id/status`, which queries Multicard's invoice API and reconciles. This is what makes local demos work.
5. `markDonationPaid()` ([donationsController.js](server/controllers/donationsController.js)) flips the donation to `paid`, sets `paid_at`/`card_pan`/`ps`, and credits `cases.raised_amount` (auto-completing the case at goal) — **transactional and idempotent** (safe for callback retries + concurrent polls).

**Key invariants:**
- A donation **only counts when `status = 'paid'`.** All read queries (donor history/stats, case `recent_donations`, admin/public stats) filter `status = 'paid'`; `raised_amount` is incremented solely by `markDonationPaid`.
- The `donations.status` column defaults to `'paid'` so seed/legacy rows count; the checkout flow explicitly inserts `'pending'`.
- Amounts are UZS in our DB but **tiyin on the wire** (×100) — see `multicard.uzsToTiyin`.
- Multicard config lives in `server/services/multicardService.js`, driven by `MULTICARD_*` env vars (see `.env.example`). Token is cached in-process until ~1 min before expiry.

To receive real callbacks in dev, expose the server publicly (e.g. ngrok) and set `SERVER_URL` accordingly; otherwise polling covers confirmation.

## Notes / context

- `client/src/services/api.js` hardcodes `baseURL: http://localhost:5000/api` rather than reading an env var — adjust for non-local deployments. (The case-image `<img>` src in a few pages similarly hardcodes the server origin.)
- `client/.env` still carries an unused Stripe test key from an earlier exploration; the live integration is Multicard, not Stripe.
- Uploaded files in `server/uploads/` are gitignored (only `.gitkeep` is tracked).
