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

## Money flow

Three parties: **buyer**, **platform** (us), **creator**.

```
Buyer pays:        buyerTotal (product) + shippingCents (shipping line)
                   └─ total charge = buyerTotal + shippingCents

Platform collects: applicationFee = serviceFee + fulfillmentCents + shippingCents + stripeFee
  → pays Stripe:   stripeFee  (~2.9% of total charge + $0.30)
  → pays Printful: fulfillmentCents + shippingCents  ($12 base + actual shipping)
  → keeps:         serviceFee  (12% of buyerTotal)

Creator receives:  total charge − applicationFee = markupCents (exactly what they set)
```

**Gross-up formula** (`src/lib/pricing.ts`): `buyerTotal` is inflated so the creator nets exactly `markupCents` after all deductions. The formula accounts for Stripe's percentage applying to the combined product + shipping total:

```
buyerTotal = ceil(
  (fulfillmentCents + markupCents + shippingCents × 2.9% + $0.30)
  / (1 − 12% − 2.9%)
)
```

**Why `applicationFee` includes the Stripe fee:** in Stripe destination charges, Stripe deducts its processing fee from the platform's `application_fee_amount` — not from the connected account. The platform is therefore responsible for the Stripe fee and recoups it through the application fee. The creator's payout is never affected by Stripe fees.

**Concrete example** — $8 markup, $6 shipping:

| | Amount |
|---|---|
| Buyer pays (product) | $23.86 |
| Buyer pays (shipping) | $6.00 |
| **Buyer total** | **$29.86** |
| Stripe fee | $1.17 |
| Fulfillment (Printful) | $18.00 |
| Service fee (platform) | $2.86 |
| **Application fee** | **$22.03** |
| **Creator receives** | **$7.83 ≈ $8.00** |
