import { describe, expect, it } from "vitest";
import { calculatePrice } from "../lib/pricing";

const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED = 30;
const PLATFORM_RATE = 0.12;

describe("calculatePrice", () => {
  it("creator nets markup exactly", () => {
    const { buyerTotal, serviceFee, creatorNet } = calculatePrice(1000, 500);
    const stripeFee = Math.round(buyerTotal * STRIPE_PERCENT + STRIPE_FIXED);
    expect(creatorNet).toBe(buyerTotal - stripeFee - serviceFee - 1000);
  });

  it("creatorNet >= markupCents (gross-up covers fees)", () => {
    const { creatorNet } = calculatePrice(1000, 500);
    expect(creatorNet).toBeGreaterThanOrEqual(500);
  });

  it("buyerTotal > baseCents + markupCents", () => {
    const { buyerTotal } = calculatePrice(2000, 800);
    expect(buyerTotal).toBeGreaterThan(2800);
  });

  it("serviceFee ~= 12% of buyerTotal", () => {
    const { buyerTotal, serviceFee } = calculatePrice(1500, 600);
    expect(Math.abs(serviceFee - Math.round(buyerTotal * PLATFORM_RATE))).toBeLessThanOrEqual(1);
  });

  it("zero markup — creatorNet ~= 0", () => {
    const { creatorNet } = calculatePrice(1000, 0);
    expect(creatorNet).toBeGreaterThanOrEqual(0);
  });

  it("large markup gross-up math holds", () => {
    const { buyerTotal, serviceFee, creatorNet } = calculatePrice(500, 5000);
    const stripeFee = Math.round(buyerTotal * STRIPE_PERCENT + STRIPE_FIXED);
    expect(buyerTotal - stripeFee - serviceFee - 500).toBe(creatorNet);
  });

  it("returns integers (cents)", () => {
    const { buyerTotal, serviceFee, creatorNet } = calculatePrice(999, 301);
    expect(Number.isInteger(buyerTotal)).toBe(true);
    expect(Number.isInteger(serviceFee)).toBe(true);
    expect(Number.isInteger(creatorNet)).toBe(true);
  });
});
