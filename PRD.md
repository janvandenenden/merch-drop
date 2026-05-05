# PRD: One-Page Merch Drop Builder — v0

## Problem Statement

Selling a one-off shirt design requires too much setup. Existing tools assume a store, a catalog, and ongoing merch operations. Creators, communities, and event organizers who want to launch a single shirt page fast — and share it with an audience they already have — face friction that kills momentum, especially for time-sensitive drops tied to a cultural moment.

## Solution

A hosted, mobile-first one-page merch drop builder. A creator uploads a PNG design, positions it on a shirt mockup, sets their markup, and publishes a clean sales page with a single shareable link. The creator connects payouts once through Stripe Connect; the same setup works for all future drops. Buyers see one price, pay through Stripe Checkout, and receive their shirt through Printful. The creator is the seller — they own customer support, refunds, and responsibility for their design rights.

No store. No catalog. One design, one page, one link.

## User Stories

### Creator — Building a Drop

1. As a creator, I want to upload a PNG design file, so that I can use my artwork on a shirt.
2. As a creator, I want to see a warning if my design resolution is too low for the desired print size, so that I avoid bad print quality.
3. As a creator, I want to drag and scale my design on the shirt's print area, so that I control exactly how it looks.
4. As a creator, I want the maximum scale of my design to be limited by its resolution, so that I can't accidentally create a blurry print.
5. As a creator, I want to preview a mockup of the shirt with my design placed on it, so that I can see what buyers will see before publishing.
6. As a creator, I want to set a title for my drop, so that buyers understand what they're looking at.
7. As a creator, I want to write an optional description, so that I can give my drop context or personality.
8. As a creator, I want to set my markup (the amount I earn per sale), so that I control my payout.
9. As a creator, I want to see the buyer-facing price calculated automatically from my markup, so that I know what buyers will pay.
10. As a creator, I want to provide my support email, so that buyers can contact me with questions.

### Creator — Publishing

11. As a creator, I want to create an account with just my email before publishing, so that my drop is saved and linked to me.
12. As a creator, I want to receive a magic link to log in, so that I don't need a password.
13. As a creator, I want to choose my creator username (slug) at account creation, so that my drops live at a URL I'm happy with.
14. As a creator, I want my drop slug to be auto-generated from the title, so that I don't have to think of one myself.
15. As a creator, I want to override the auto-generated drop slug, so that I can customize my drop URL.
16. As a creator, I want to confirm I own the rights to my design before publishing, so that the terms of use are clear.
17. As a creator, I want to publish my drop before setting up Stripe, so that I can share the link and build hype before completing payout setup.
18. As a creator, I want my published-but-not-yet-live drop to show a "coming soon" message to buyers, so that they know it's real but not yet purchasable.

### Creator — Enabling Checkout

19. As a creator, I want to click "Enable checkout" to start Stripe onboarding, so that I can begin accepting payments.
20. As a creator, I want Stripe onboarding to collect only what's immediately required, so that I face minimal friction before going live.
21. As a creator, I want my drop to go live automatically once Stripe onboarding is complete and charges are enabled, so that I don't have to manually activate it.
22. As a creator, I want my connected Stripe account to be reused for all future drops, so that I only onboard once.

### Creator — Managing Drops

23. As a creator, I want to see a list of all my drops with their status, so that I can manage them in one place.
24. As a creator, I want to copy my drop's shareable link from the dashboard, so that I can share it anywhere.
25. As a creator, I want to see which drops still need checkout enabled, so that I know what's blocking them from going live.
26. As a creator, I want to edit my drop's title, description, and support email at any time, so that I can keep the page accurate.
27. As a creator, I want the price and design to lock after the first sale, so that buyers who shared the link see a consistent product.
28. As a creator, I want to close a drop manually, so that I can stop selling when I'm done.
29. As a creator, I want to log in with a magic link and land on my drops list, so that I can manage my drops from any device.

### Buyer — Purchasing

30. As a buyer, I want to see the shirt design mockup on the product page, so that I know what I'm buying.
31. As a buyer, I want to see the price clearly, so that I know what I'll pay.
32. As a buyer, I want to select my size before checking out, so that I get the right fit.
33. As a buyer, I want to see "printed & shipped in 3–5 business days" on the page, so that I have realistic expectations.
34. As a buyer, I want to see the creator's support email, so that I know who to contact with questions.
35. As a buyer, I want to check out through Stripe, so that my payment is secure.
36. As a buyer, I want to see live shipping rates at checkout based on my address, so that I'm not surprised by shipping costs.
37. As a buyer, I want to be able to order internationally, so that I'm not blocked by geography.
38. As a buyer, I want to receive a shipping confirmation email with tracking, so that I can follow my order.
39. As a buyer, I want to see a "this drop is closed" message if I visit a closed drop URL, so that I understand why I can't buy.
40. As a buyer, I want to see a "coming soon" message if checkout isn't live yet, so that I know the drop exists but isn't purchasable.
41. As a buyer, I want to receive a full refund if my order is cancelled due to a fulfillment issue, so that I'm not out of pocket.

## Implementation Decisions

### Tech Stack

- **Framework:** Next.js 16 App Router
- **Database:** Neon (Postgres) + Drizzle ORM
- **Auth:** BetterAuth with magic link (email OTP via Resend)
- **Storage:** Cloudflare R2 (original design + print file)
- **Image processing:** Sharp (server-side print file compositing)
- **Email:** Resend
- **Payments:** Stripe Connect (direct charges + application fee)
- **Fulfillment:** Printful API
- **Hosting:** Vercel

### Modules

**Pricing Calculator**
Pure function. Inputs: Printful base cost (cents), creator markup (cents), platform fee rate (12%). Output: buyer-facing total. Platform fee is grossed up to cover Stripe processing fees so creator nets their markup exactly. Buyer sees: base + markup + service fee (one line).

**Design Editor**
Client-side component. Accepts PNG upload only. Derives maximum print size from image resolution (Printful BC 3001 front: 12"×16" at 150 DPI minimum = 1800×2400px). Creator drags and scales design within the print area. No rotation. Outputs placement state: `{ x, y, scale }`. Resolution below minimum at desired scale shows a blocking warning.

**Print File Compositor**
Server-side Sharp job. Inputs: original design file from R2, placement `{ x, y, scale }`. Composites design onto transparent canvas at Printful's required print file dimensions. Outputs print-ready PNG to R2. Runs when creator saves placement.

**Mockup Generator**
Calls Printful Mockup Generator API with print file URL and shirt color (white, BC 3001). Stores returned mockup URL on the drop record. Runs after compositor completes. Re-runs if design or placement changes before first sale.

**Storage (R2)**
Handles upload and signed URL retrieval for original design files and print-ready files. Two separate key prefixes: `designs/` and `print-files/`.

**Drop Manager**
Handles drop CRUD, status transitions (`ready` → `live` → `closed`), and slug generation (auto from title, creator-overridable, unique per user). Enforces lock on price and design fields after `firstSaleAt` is set. Slug: URL-safe, lowercase, hyphenated.

**Auth**
BetterAuth magic link flow. User table extended with `slug` (unique creator username) and Stripe fields (`stripeAccountId`, `chargesEnabled`). Creator picks slug at account creation.

**Stripe Connect**
Creates connected account on "Enable checkout". Generates hosted onboarding link (incremental — `currently_due` only). Polls or webhooks for `charges_enabled` → sets `chargesEnabled: true` on user → transitions drop to `live`. One connected account per creator, reused across all drops.

**Checkout**
Creates Stripe Checkout session on "Buy now". Destination charge to creator's connected account via `transfer_data`. Platform sets `application_fee_amount = serviceFee + fulfillmentCents + shippingCents + stripeFee`, which allows the platform to pay Stripe, cover Printful fulfillment and shipping costs, and retain the 12% service fee — while the creator receives exactly their markup. Fetches live shipping rates from Printful API and passes as Stripe shipping options. Session metadata stores `fulfillmentCents` and `shippingCents` for downstream webhook use. Requires buyer email.

**Stripe Webhooks**
Handles `checkout.session.completed`: captures buyer info, creates order record, submits order to Printful. Handles Printful rejection: issues full refund from connected account, emails buyer and creator. All handlers idempotent.

**Printful Client**
Wraps Printful REST API. Methods: submit order, generate mockup, fetch shipping rates. Handles auth and error normalization.

**Printful Webhooks**
Handles `package_shipped`: updates order status to `shipped`, stores tracking number on order record.

**Public Drop Page**
Server-rendered. Shows mockup, price, size selector (S/M/L/XL/2XL), support email, production time copy, buy button. Renders three states: `ready` (coming soon), `live` (full page + checkout), `closed` (drop closed message). URL: `platform.com/[creator-slug]/[drop-slug]`.

**Creator Dashboard**
Lists all drops for logged-in creator. Columns: title, status, share URL, actions. Shows "Enable checkout" CTA for drops in `ready` with no connected Stripe account or charges not enabled. Entry point for creating a new drop.

### Data Model

Two app-owned tables (BetterAuth owns auth tables):

**drop**
- id, userId, slug, title, description, supportEmail
- markupCents, shirtColor (fixed: white in v0)
- status (ready | live | closed)
- designFileKey, printFileKey, mockupUrl
- placement (JSON: x, y, scale)
- firstSaleAt, createdAt, updatedAt
- Unique constraint: (userId, slug)

**order**
- id, dropId, stripeSessionId (unique), printfulOrderId
- status (pending | paid | submitted | shipped | cancelled)
- size, shippingAddress (JSON), buyerEmail
- totalCents, markupCents, fulfillmentCents, shippingCents
- cancellationReason (text, nullable), cancelledAt (timestamp, nullable)
- refundedAt (timestamp, nullable) — set only when refund API call succeeds
- confirmationEmailSentAt (timestamp, nullable) — set when order submitted to Printful
- shippingEmailSentAt (timestamp, nullable) — set when package_shipped webhook fires
- createdAt

Allowed status transitions: `pending → paid → submitted → shipped` (happy path); `paid | submitted → cancelled` (Printful rejection or manual). `shipped` and `cancelled` are terminal.

BetterAuth user extended with: `slug` (unique), `stripeAccountId`, `chargesEnabled`.

### Pricing Formula

```
stripeFee       = (buyerTotal + shippingCents) × 2.9% + $0.30
serviceFee      = buyerTotal × 12%
applicationFee  = serviceFee + fulfillmentCents + shippingCents + stripeFee

buyerTotal      = ceil((fulfillmentCents + markupCents + shippingCents × 2.9% + $0.30) / (1 − 12% − 2.9%))
creatorNets     = markupCents (exactly)
platformNets    = serviceFee + fulfillmentCents + shippingCents (after Stripe deducts its fee from applicationFee)
```

In Stripe destination charges, Stripe deducts its fee from the platform's `application_fee_amount`, not from the connected account. `applicationFee` is therefore set to include the Stripe fee so the platform can pay Stripe and still recover fulfillment + shipping costs. The gross-up formula inflates `buyerTotal` to ensure the creator nets exactly `markupCents` after all deductions. Shipping is added as a separate Stripe line item; the `shippingCents × 2.9%` term in the numerator compensates for Stripe's percentage applying to the combined total.

### URL Structure

`platform.com/[creator-slug]/[drop-slug]`

### Refund Policy

On Printful rejection: platform auto-issues full refund to buyer from creator's connected Stripe account. The Stripe processing fee is collected by the platform via `application_fee_amount` and is non-recoverable — it is absorbed by the platform, not the creator. Creator is notified by email. Creator agrees to this at publish time via ToS checkbox.

### Shirt

Bella Canvas 3001, white only, sizes S–M–L–XL–2XL. One drop = one shirt color.

## Testing Decisions

Good tests verify external behavior, not implementation details. Test inputs and outputs, not internal calls or state. Use fixture data. Never test that a function was called — test what it returned or what changed.

**Modules with TDD:**

- **Pricing Calculator** — exhaustive input/output tests. Verify buyer total, service fee, creator net across markup values. Verify gross-up math is correct.
- **Print File Compositor** — test with fixture PNG inputs. Verify output dimensions match Printful spec. Verify placement is applied correctly (position, scale).
- **Slug Generator** — test auto-generation from titles (special chars, unicode, collisions, long strings). Test uniqueness enforcement.
- **Drop Manager** — test status transitions (valid and invalid). Test lock enforcement on price/design after firstSaleAt. Test slug uniqueness per user.
- **Stripe Webhook Handlers** — test with fixture Stripe event payloads. Verify correct order creation on `checkout.session.completed`. Verify refund triggered on Printful rejection. Verify idempotency (duplicate event = no duplicate order).

**Modules without dedicated tests:**
- Auth (BetterAuth owns behavior)
- UI components and pages (verify in browser)
- R2 Storage (thin wrapper, integration-tested implicitly)
- Printful Client (mock in unit tests, verify via manual end-to-end)

## Out of Scope

- Multiple shirt colors per drop
- Multiple shirt models
- Limited-time drops or preorders (drops are evergreen)
- Countdown timers or urgency features
- Creator analytics or revenue dashboard
- Order tracking dashboard for creators
- Platform-branded shipping/tracking emails (Printful sends these)
- Embedded Stripe onboarding
- Custom domains
- Email capture on pre-live pages
- Page duplication
- Marketplace discovery or browsing
- Buyer accounts
- Draft saving before account creation
- International shipping restrictions (international is allowed)
- Per-creator platform fee overrides
- Multiple POD providers

## Further Notes

- Creator is merchant of record via Stripe Connect direct charges. Refunds and chargebacks are debited from the connected account, correctly aligning responsibility with the creator.
- Platform never handles buyer funds directly.
- Stripe hosted onboarding uses incremental requirements (`currently_due` only) to minimize upfront friction. Avoid pre-filling onboarding fields excessively to preserve Stripe's networked onboarding eligibility.
- Printful has no pre-validation API for copyright checks. Enforcement is reactive (manual review post-submission). Creator ToS checkbox at publish is the v0 mitigation.
- Sharp requires Node.js runtime — not compatible with Cloudflare Workers. This is why Vercel (not Cloudflare) was chosen for hosting.
- Platform fee (12%) is hardcoded. No per-creator overrides in v0.
- Creator is customer #1: validate the full end-to-end flow by the builder launching their own drop before onboarding external creators.
