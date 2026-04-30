import { describe, expect, it } from "vitest";
import { calculatePrice } from "../lib/pricing";

const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED = 30;
const PLATFORM_RATE = 0.12;

describe("calculatePrice", () => {
  it("creator nets markupCents (±1 cent rounding from ceil)", () => {
    const { creatorNet } = calculatePrice(1200, 800);
    // ceil in gross-up can add 1 cent to creatorNet
    expect(creatorNet).toBeGreaterThanOrEqual(800);
    expect(creatorNet).toBeLessThanOrEqual(801);
  });

  it("creator nets markupCents with shipping (±1 cent rounding)", () => {
    const { creatorNet } = calculatePrice(1200, 800, 599);
    expect(creatorNet).toBeGreaterThanOrEqual(800);
    expect(creatorNet).toBeLessThanOrEqual(801);
  });

  it("applicationFee = serviceFee + fulfillmentCents + shippingCents + stripeFee", () => {
    const shippingCents = 499;
    const { buyerTotal, serviceFee, applicationFee, fulfillmentCents } = calculatePrice(1200, 500, shippingCents);
    const totalCharge = buyerTotal + shippingCents;
    const stripeFee = Math.round(totalCharge * STRIPE_PERCENT + STRIPE_FIXED);
    expect(applicationFee).toBe(serviceFee + fulfillmentCents + shippingCents + stripeFee);
  });

  it("fulfillmentCents equals baseCents", () => {
    const { fulfillmentCents } = calculatePrice(1200, 500, 300);
    expect(fulfillmentCents).toBe(1200);
  });

  it("platform nets serviceFee + baseCents + shippingCents after Stripe deducts its fee", () => {
    const shippingCents = 600;
    const { buyerTotal, applicationFee, serviceFee, fulfillmentCents } = calculatePrice(1200, 800, shippingCents);
    const totalCharge = buyerTotal + shippingCents;
    const stripeFee = Math.round(totalCharge * STRIPE_PERCENT + STRIPE_FIXED);
    const platformNet = applicationFee - stripeFee;
    expect(platformNet).toBe(serviceFee + fulfillmentCents + shippingCents);
  });

  it("buyerTotal > baseCents + markupCents (gross-up adds fees)", () => {
    const { buyerTotal } = calculatePrice(1200, 800);
    expect(buyerTotal).toBeGreaterThan(2000);
  });

  it("serviceFee ~= 12% of buyerTotal", () => {
    const { buyerTotal, serviceFee } = calculatePrice(1500, 600, 400);
    expect(Math.abs(serviceFee - Math.round(buyerTotal * PLATFORM_RATE))).toBeLessThanOrEqual(1);
  });

  it("zero markup — creatorNet = 0", () => {
    const { creatorNet } = calculatePrice(1200, 0);
    expect(creatorNet).toBe(0);
  });

  it("returns integers (cents)", () => {
    const { buyerTotal, serviceFee, applicationFee, fulfillmentCents, creatorNet } = calculatePrice(999, 301, 350);
    expect(Number.isInteger(buyerTotal)).toBe(true);
    expect(Number.isInteger(serviceFee)).toBe(true);
    expect(Number.isInteger(applicationFee)).toBe(true);
    expect(Number.isInteger(fulfillmentCents)).toBe(true);
    expect(Number.isInteger(creatorNet)).toBe(true);
  });

  it("shipping=0 behaves like no-shipping call", () => {
    const a = calculatePrice(1200, 600, 0);
    const b = calculatePrice(1200, 600);
    expect(a).toEqual(b);
  });
});
