export const BASE_SHIRT_COST_CENTS = 1200;

const PLATFORM_FEE_RATE = 0.12;
// Stripe: 2.9% + 30¢
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

export interface PriceBreakdown {
  /** Stripe line item amount (excludes shipping, which Stripe adds separately) */
  buyerTotal: number;
  /** Total the buyer pays: buyerTotal + shippingCents */
  grandTotal: number;
  serviceFee: number;
  applicationFee: number;
  fulfillmentCents: number;
  creatorNet: number;
}

/**
 * Gross-up formula accounting for shipping in Stripe fee base.
 * applicationFee = serviceFee + fulfillmentCents + shippingCents — platform collects
 * fulfillment and shipping so creator nets exactly markupCents.
 */
export function calculatePrice(
  baseCents: number,
  markupCents: number,
  shippingCents: number = 0
): PriceBreakdown {
  const buyerTotal = Math.ceil(
    (baseCents + markupCents + shippingCents * STRIPE_PERCENT + STRIPE_FIXED_CENTS) /
      (1 - PLATFORM_FEE_RATE - STRIPE_PERCENT)
  );

  const totalCharge = buyerTotal + shippingCents;
  const stripeFee = Math.round(totalCharge * STRIPE_PERCENT + STRIPE_FIXED_CENTS);
  const serviceFee = Math.round(buyerTotal * PLATFORM_FEE_RATE);
  const applicationFee = serviceFee + baseCents + shippingCents + stripeFee;
  const creatorNet = totalCharge - applicationFee;

  return { buyerTotal, grandTotal: totalCharge, serviceFee, applicationFee, fulfillmentCents: baseCents, creatorNet };
}

/** Fixed buyer-facing product price computed from base cost only — no shipping influence. */
export function fixedProductPrice(markupCents: number): number {
  return Math.ceil(
    (BASE_SHIRT_COST_CENTS + markupCents + STRIPE_FIXED_CENTS) /
      (1 - PLATFORM_FEE_RATE - STRIPE_PERCENT)
  );
}

/** Inverse of fixedProductPrice — derive markupCents from a desired sale price. */
export function salePriceToMarkupCents(salePriceCents: number): number {
  return Math.max(
    0,
    Math.floor(salePriceCents * (1 - PLATFORM_FEE_RATE - STRIPE_PERCENT) - BASE_SHIRT_COST_CENTS - STRIPE_FIXED_CENTS),
  );
}

export interface ApplicationFeeBreakdown {
  applicationFee: number;
  serviceFee: number;
  creatorNet: number;
}

/** Internal fee accounting after product price is fixed. Creator net may differ slightly from markupCents. */
export function computeApplicationFee(
  productPriceCents: number,
  fulfillmentCents: number,
  shippingCents: number,
): ApplicationFeeBreakdown {
  const totalCharge = productPriceCents + shippingCents;
  const stripeFee = Math.round(totalCharge * STRIPE_PERCENT + STRIPE_FIXED_CENTS);
  const serviceFee = Math.round(productPriceCents * PLATFORM_FEE_RATE);
  const applicationFee = serviceFee + fulfillmentCents + shippingCents + stripeFee;
  const creatorNet = totalCharge - applicationFee;
  return { applicationFee, serviceFee, creatorNet };
}
