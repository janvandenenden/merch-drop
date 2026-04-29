# Merch Drop

One-page merch drop builder. Creator uploads a design, positions it on a shirt mockup, sets their markup, and publishes a shareable sales page. Buyers pay through Stripe; orders fulfil via Printful.

## Stack

- **Next.js 16** (App Router) + React 19
- **Neon** (Postgres) + Drizzle ORM
- **Better Auth** — magic link (email OTP via Resend)
- **Cloudflare R2** — design + print file storage
- **Stripe Connect** — direct charges + application fee
- **Printful** — print-on-demand fulfillment
- **Vercel** — hosting

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket
- A [Resend](https://resend.com) account (magic link emails)
- A [Stripe](https://stripe.com) account (test mode is fine locally)
- A [Printful](https://printful.com) account + store

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd merch-drop
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `BETTER_AUTH_SECRET` | Random secret for Better Auth (run `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Auth origin — `http://localhost:3000` locally |
| `RESEND_API_KEY` | Resend API key (for magic link emails) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...`) |
| `PRINTFUL_API_KEY` | Printful API key |
| `PRINTFUL_STORE_ID` | Printful store ID |
| `NEXT_PUBLIC_URL` | Public app URL — `http://localhost:3000` locally |

### 3. Run database migrations

```bash
npx drizzle-kit push
```

### 4. Start the dev server

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Stripe webhooks (local)

Stripe events (checkout completion, etc.) hit `/api/stripe/webhook`. To receive them locally, forward with the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

## Seed data

Creates a test creator and three drops (pre-live, live, closed):

```bash
npm run seed
```

After seeding, visit:
- `http://localhost:3000/seed-creator/coming-soon-drop` — pre-live state
- `http://localhost:3000/seed-creator/live-drop` — live (purchasable)
- `http://localhost:3000/seed-creator/closed-drop` — closed state

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run seed` | Seed test data |
| `npm run reset-stripe <email>` | Reset Stripe Connect status for a creator (re-run onboarding flow) |

## Project structure

```
src/
├── app/              # Routes (Next.js App Router)
│   ├── (auth)/       # Login / signup / verify
│   ├── api/          # API routes (auth, drops, stripe, webhooks)
│   ├── dashboard/    # Creator dashboard
│   ├── drops/        # Drop editor
│   └── [creatorSlug]/[dropSlug]/  # Public drop pages
├── components/       # UI components
├── lib/              # Server logic (db, auth, stripe, printful, pricing, storage)
└── types/            # Shared TypeScript types
```

## Key concepts

- **Drop statuses:** `pre_live` → `live` → `closed`. Checkout is only available on `live` drops.
- **Stripe Connect:** each creator connects once; their account is reused for all drops. Platform takes 12% application fee.
- **Price lock:** once a drop has its first sale, price and design are locked.
- **Fulfillment:** `checkout.session.completed` webhook submits the order to Printful. Printful rejection triggers an automatic full refund.
