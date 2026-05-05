import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  PrintfulError,
  estimateOrderCost,
  generatePrintfulMockupUrl,
  getShippingRates,
  submitOrder,
  type PrintfulOrder,
} from "../lib/printful"

// BC 3001 white Medium — used across all tests
const BC3001_WHITE_M = 4012

const hasKey = !!process.env.PRINTFUL_API_KEY
// Optional: set to a publicly accessible PNG URL (e.g. a signed R2 URL) to run mockup + order tests
const hasPrintFile = hasKey && !!process.env.PRINTFUL_TEST_FILE_URL
const printFileUrl = process.env.PRINTFUL_TEST_FILE_URL ?? ""

// ─── Shipping rates ───────────────────────────────────────────────────────────

describe.skipIf(!hasKey)("getShippingRates", () => {
  it("returns at least one rate for a US address", async () => {
    const rates = await getShippingRates(
      {
        address1: "1 Hacker Way",
        city: "Menlo Park",
        stateCode: "CA",
        countryCode: "US",
        zip: "94025",
      },
      [{ variantId: BC3001_WHITE_M, quantity: 1 }],
    )

    expect(rates.length).toBeGreaterThan(0)
    const rate = rates[0]
    expect(rate.id).toBeTruthy()
    expect(rate.name).toBeTruthy()
    expect(parseFloat(rate.rate)).toBeGreaterThanOrEqual(0)
    expect(rate.currency).toBe("USD")
  })

  it("returns at least one rate for an international address", async () => {
    const rates = await getShippingRates(
      {
        address1: "Nieuwezijds Voorburgwal 147",
        city: "Amsterdam",
        countryCode: "NL",
        zip: "1012 RJ",
      },
      [{ variantId: BC3001_WHITE_M, quantity: 1 }],
    )

    expect(rates.length).toBeGreaterThan(0)
    expect(rates[0].currency).toBeDefined()
  })

  it("throws PrintfulError for an invalid address", async () => {
    await expect(
      getShippingRates(
        { address1: "???", city: "???", countryCode: "ZZ", zip: "00000" },
        [{ variantId: BC3001_WHITE_M, quantity: 1 }],
      ),
    ).rejects.toBeInstanceOf(PrintfulError)
  })
})

// ─── Order estimate ───────────────────────────────────────────────────────────

describe.skipIf(!hasPrintFile)("estimateOrderCost", () => {
  it("returns a positive integer for a US address", async () => {
    const cost = await estimateOrderCost(
      {
        address1: "1 Hacker Way",
        city: "Menlo Park",
        stateCode: "CA",
        countryCode: "US",
        zip: "94025",
      },
      [{ variantId: BC3001_WHITE_M, quantity: 1 }],
      printFileUrl,
    )
    expect(typeof cost).toBe("number")
    expect(Number.isInteger(cost)).toBe(true)
    expect(cost).toBeGreaterThan(0)
  })

  it("returns a higher cost for an EU address (VAT applied)", async () => {
    const usCost = await estimateOrderCost(
      { address1: "1 Hacker Way", city: "Menlo Park", stateCode: "CA", countryCode: "US", zip: "94025" },
      [{ variantId: BC3001_WHITE_M, quantity: 1 }],
      printFileUrl,
    )
    const euCost = await estimateOrderCost(
      { address1: "Nieuwezijds Voorburgwal 147", city: "Amsterdam", countryCode: "NL", zip: "1012 RJ" },
      [{ variantId: BC3001_WHITE_M, quantity: 1 }],
      printFileUrl,
    )
    expect(euCost).toBeGreaterThan(usCost)
  })
})

// ─── Generate mockup ──────────────────────────────────────────────────────────

describe.skipIf(!hasPrintFile)("generatePrintfulMockupUrl", () => {
  it(
    "returns a valid HTTPS mockup URL",
    async () => {
      const url = await generatePrintfulMockupUrl(printFileUrl, [BC3001_WHITE_M])
      expect(url).toMatch(/^https:\/\//)
    },
    120_000, // 60s poll + up to 30s rate limit backoff + buffer
  )
})

// ─── Submit order ─────────────────────────────────────────────────────────────

describe.skipIf(!hasPrintFile)("submitOrder", () => {
  let createdOrder: PrintfulOrder

  beforeAll(async () => {
    createdOrder = await submitOrder({
      recipient: {
        name: "Test Buyer",
        email: "test@example.com",
        address1: "1 Hacker Way",
        city: "Menlo Park",
        stateCode: "CA",
        countryCode: "US",
        zip: "94025",
      },
      items: [{ variantId: BC3001_WHITE_M, quantity: 1, printFileUrl }],
    })
  })

  afterAll(async () => {
    // Delete the draft so it doesn't sit in the Printful dashboard
    if (!createdOrder?.id) return
    const key = process.env.PRINTFUL_API_KEY
    await fetch(`https://api.printful.com/orders/${createdOrder.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    })
  })

  it("returns an order with a numeric id", () => {
    expect(typeof createdOrder.id).toBe("number")
  })

  it("returns draft status (not auto-confirmed)", () => {
    expect(createdOrder.status).toBe("draft")
  })

  it("returns normalized recipient with countryCode", () => {
    expect(createdOrder.recipient.countryCode).toBe("US")
  })

  it("returns items with variantId", () => {
    expect(createdOrder.items[0].variantId).toBe(BC3001_WHITE_M)
  })
})

// ─── Error handling ───────────────────────────────────────────────────────────

describe.skipIf(!hasKey)("PrintfulError", () => {
  it("has code, reason, and message", async () => {
    try {
      await getShippingRates(
        { address1: "bad", city: "bad", countryCode: "ZZ", zip: "bad" },
        [{ variantId: BC3001_WHITE_M, quantity: 1 }],
      )
    } catch (err) {
      expect(err).toBeInstanceOf(PrintfulError)
      const printfulErr = err as PrintfulError
      expect(typeof printfulErr.code).toBe("number")
      expect(typeof printfulErr.reason).toBe("string")
      expect(typeof printfulErr.message).toBe("string")
    }
  })
})
