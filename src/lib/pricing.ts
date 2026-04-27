const PLATFORM_FEE_RATE = 0.12;
// Stripe: 2.9% + 30¢
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

export interface PriceBreakdown {
  buyerTotal: number;
  serviceFee: number;
  creatorNet: number;
}

/**
 * Gross-up formula: total = (base + markup + fixed) / (1 - platform% - stripe%)
 * Ensures creator nets markupCents exactly after Stripe and platform fees.
 */
export function calculatePrice(
  baseCents: number,
  markupCents: number
): PriceBreakdown {
  const subtotal = baseCents + markupCents;
  const buyerTotal = Math.ceil(
    (subtotal + STRIPE_FIXED_CENTS) / (1 - PLATFORM_FEE_RATE - STRIPE_PERCENT)
  );

  const stripeFee = Math.round(buyerTotal * STRIPE_PERCENT + STRIPE_FIXED_CENTS);
  const serviceFee = Math.round(buyerTotal * PLATFORM_FEE_RATE);
  const creatorNet = buyerTotal - stripeFee - serviceFee - baseCents;

  return { buyerTotal, serviceFee, creatorNet };
}
