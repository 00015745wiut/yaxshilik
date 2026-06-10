# Yaxshilik.uz — Charity Donation Platform

## Description

A full-stack web application connecting donors with verified charity cases across Uzbekistan. Donors can browse cases, contribute any amount, track their donation history, and print receipts. Admins can create, edit, and manage cases through a dedicated panel.

**Stack:** React 18 + Vite · Tailwind CSS v4 · Express.js · PostgreSQL · JWT Auth

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd yaxshilik
```

### 2. Install dependencies

```bash
npm install          # installs concurrently at root
npm run install:all  # installs server + client dependencies
```

### 3. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/yaxshilik
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:5173
```

### 4. Create the PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE yaxshilik;"
```

### 5. Run migrations and seed data

```bash
npm run db:setup
```

This runs `db/migrate.js` (creates tables + indexes) then `db/seed.js` (inserts demo users, categories, cases, and donations).

### 6. Generate placeholder images

```bash
npm run db:placeholders
```

Writes `case-1.svg` through `case-6.svg` into `server/uploads/`.

---

## Running the Application

### Development (both server and client with hot reload)

```bash
npm run dev
```

- Server: http://localhost:5000
- Client: http://localhost:5173

### Run server or client individually

```bash
npm run dev:server   # Express + nodemon
npm run dev:client   # Vite dev server
```

---

## Demo Accounts

| Role  | Email              | Password  |
|-------|--------------------|-----------|
| Admin | admin@yaxshilik.uz | Admin123! |
| Donor | donor@yaxshilik.uz | Donor123! |

---

## Database Scripts

| Command                   | Description                              |
|---------------------------|------------------------------------------|
| `npm run db:migrate`      | Create tables and indexes                |
| `npm run db:seed`         | Insert demo data                         |
| `npm run db:setup`        | Migrate then seed (first-time setup)     |
| `npm run db:reset`        | Drop and recreate all tables, then seed  |
| `npm run db:placeholders` | Generate SVG placeholder images          |

---

## Project Structure

```
yaxshilik/
├── package.json             # Root scripts (concurrently)
├── README.md
│
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # AuthContext, ToastContext
│       ├── pages/           # Route-level page components
│       ├── services/        # Axios API service modules
│       └── utils/           # Format helpers
│
└── server/                  # Express.js backend
    ├── config/              # Database pool (pg)
    ├── controllers/         # Route handler logic
    ├── db/                  # migrate.js, seed.js, generate-placeholders.js
    ├── middleware/          # auth, upload, errorHandler
    ├── routes/              # Express routers
    ├── uploads/             # Served static files (images, SVGs)
    └── utils/               # asyncHandler wrapper
```

---

## API Overview

| Method | Endpoint                 | Auth   | Description                     |
|--------|--------------------------|--------|---------------------------------|
| POST   | /api/auth/register       | —      | Register a new donor account    |
| POST   | /api/auth/login          | —      | Login, receive JWT              |
| GET    | /api/auth/me             | Bearer | Get current user profile        |
| GET    | /api/cases               | —      | List cases (filter/sort/search) |
| GET    | /api/cases/:id           | —      | Case detail + recent donations  |
| POST   | /api/cases               | Admin  | Create a case (+ image & proof files) |
| PUT    | /api/cases/:id           | Admin  | Update a case (appends new proofs) |
| DELETE | /api/cases/:id           | Admin  | Close a case                    |
| DELETE | /api/cases/:id/proofs/:proofId | Admin | Remove a proof from a case   |
| GET    | /api/cases/admin/stats   | Admin  | Admin dashboard statistics      |
| POST   | /api/donations/checkout  | Bearer | Start a payment (returns checkout_url) |
| GET    | /api/donations/:id/status| Bearer | Poll a donation's payment status |
| GET    | /api/donations/my        | Bearer | Donor's donation history        |
| GET    | /api/donations/my/stats  | Bearer | Donor's aggregate stats         |
| GET    | /api/donations/recent    | Admin  | 20 most recent donations        |
| POST   | /api/payments/callback   | —      | Multicard callback (signature-verified) |
| GET    | /api/categories          | —      | List all categories             |
| GET    | /api/stats/public        | —      | Public platform statistics      |
| GET    | /api/health              | —      | Health check                    |

---

## Case Verification (Proofs)

Each charity case can include **proof** of why funds are needed, so donors can see it's genuine. While creating or editing a case, an admin uploads three kinds of evidence:

- **Official documents** — PDF or scanned government/medical letters, invoices
- **Photos** — images of the person or situation
- **Video** — a short clip (up to 50 MB)

The admin reviews the materials, attaches them in the case form, and publishes. The proofs then appear in a **Proof & Verification** section on the public case page (documents as links, photos as a gallery, videos as players), and cases with proofs show a **Verified** badge in listings. Proofs can be removed individually when editing a case.

## Payments (Multicard / Rahmat)

Donations are paid through the **Multicard** hosted-checkout gateway. The app ships configured for Multicard's **sandbox** so you can demo a full payment without real money.

**How it works:** confirming a donation creates a `pending` donation and a Multicard invoice, then redirects the donor to Multicard's checkout page. After paying, the donor returns to `/donations/return`, which polls the backend until the payment is confirmed (the backend reconciles against Multicard). A donation only credits its case once it reaches `paid`.

**Test a payment:**
1. Sign in as the demo donor, open any active case, choose an amount, and confirm.
2. On the Multicard page, pay with the sandbox test card:
   - Card **8600 5333 6409 8829**, expiry **28/06**, OTP **112233**
3. You'll be returned to the app and see the confirmation + printable receipt.

**Configuration** (`server/.env` — see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `MULTICARD_BASE_URL` | `https://dev-mesh.multicard.uz` (sandbox) or `https://mesh.multicard.uz` (prod) |
| `MULTICARD_APPLICATION_ID` / `MULTICARD_SECRET` | Gateway credentials |
| `MULTICARD_STORE_ID` | Store/register ID |
| `MULTICARD_SEND_OFD`, `MULTICARD_OFD_*` | Fiscal-receipt (OFD) data; set `MULTICARD_SEND_OFD=false` to omit |
| `SERVER_URL` | Public URL of this server, used to build the callback URL |

> On `localhost` the gateway's server-to-server callback can't reach you, so the app confirms payments by **polling** instead. To receive real callbacks, expose the server (e.g. an ngrok tunnel) and set `SERVER_URL` to the public URL. Replace the sandbox credentials with your production values before going live.

## Production Build

```bash
npm run build        # builds client to client/dist/
```

Configure your reverse proxy (nginx/caddy) to:
- Serve `client/dist/` for all non-API routes
- Proxy `/api/*` and `/uploads/*` to the Express server on port 5000

Set `NODE_ENV=production` in your server environment for production-safe error handling and access log format.
