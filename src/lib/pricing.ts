export const BASE_SHIRT_COST_CENTS = 1200;

const PLATFORM_FEE_RATE = 0.12;
// Stripe: 2.9% + 30¢
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

export interface PriceBreakdown {
  buyerTotal: number;
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

  return { buyerTotal, serviceFee, applicationFee, fulfillmentCents: baseCents, creatorNet };
}
