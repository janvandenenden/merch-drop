import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindFirstDrop = vi.fn()
const mockFindFirstUser = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      drop: { findFirst: mockFindFirstDrop },
      user: { findFirst: mockFindFirstUser },
    },
  },
}))

vi.mock("@/lib/db/schema", () => ({
  drop: "drop-table",
  user: "user-table",
}))

const mockSessionsCreate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: mockSessionsCreate } } },
}))

const mockCalculatePrice = vi.fn()
vi.mock("@/lib/pricing", () => ({
  calculatePrice: mockCalculatePrice,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DROP_ID = "123e4567-e89b-12d3-a456-426614174000"

const DROP = {
  id: DROP_ID,
  userId: "user-1",
  title: "Test Drop",
  markupCents: 1000,
  status: "live",
  slug: "test-drop",
}

const CREATOR = {
  id: "user-1",
  slug: "creator",
  stripeAccountId: "acct_test",
  chargesEnabled: true,
}

const ADDRESS = {
  name: "Jane Doe",
  address1: "1 Main St",
  city: "Portland",
  stateCode: "OR",
  zip: "97201",
  countryCode: "US",
}

const SELECTED_RATE = {
  id: "STANDARD",
  name: "Standard",
  rate: "5.99",
  currency: "USD",
  minDeliveryDays: 3,
  maxDeliveryDays: 5,
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    dropId: DROP_ID,
    size: "M",
    address: ADDRESS,
    selectedRate: SELECTED_RATE,
    fulfillmentCents: 1350,
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_URL = "http://localhost:3000"

  mockFindFirstDrop.mockResolvedValue(DROP)
  mockFindFirstUser.mockResolvedValue(CREATOR)
  mockCalculatePrice.mockReturnValue({
    buyerTotal: 2800,
    applicationFee: 500,
    fulfillmentCents: 1350,
    serviceFee: 200,
    creatorNet: 1000,
  })
  mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session" })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/checkout", () => {
  describe("validation", () => {
    it("returns 400 when fulfillmentCents is missing", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      const body = validBody()
      delete (body as Record<string, unknown>).fulfillmentCents
      const res = await POST(makeRequest(body))
      expect(res.status).toBe(400)
    })

    it("returns 400 when fulfillmentCents is not an integer", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      const res = await POST(makeRequest(validBody({ fulfillmentCents: "not-a-number" })))
      expect(res.status).toBe(400)
    })

    it("returns 400 when fulfillmentCents is a float", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      const res = await POST(makeRequest(validBody({ fulfillmentCents: 13.5 })))
      expect(res.status).toBe(400)
    })

    it("returns 404 when drop not found", async () => {
      mockFindFirstDrop.mockResolvedValue(null)
      const { POST } = await import("@/app/api/checkout/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(404)
    })

    it("returns 404 when drop is not live", async () => {
      mockFindFirstDrop.mockResolvedValue({ ...DROP, status: "paused" })
      const { POST } = await import("@/app/api/checkout/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(404)
    })
  })

  describe("fulfillmentCents clamping", () => {
    it("clamps fulfillmentCents below min (800) up to 800", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 100 })))
      expect(mockCalculatePrice).toHaveBeenCalledWith(800, DROP.markupCents, expect.any(Number))
    })

    it("clamps fulfillmentCents above max (5000) down to 5000", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 9999 })))
      expect(mockCalculatePrice).toHaveBeenCalledWith(5000, DROP.markupCents, expect.any(Number))
    })

    it("passes fulfillmentCents unchanged when within valid range", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 1350 })))
      expect(mockCalculatePrice).toHaveBeenCalledWith(1350, DROP.markupCents, expect.any(Number))
    })

    it("accepts boundary value of 800", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 800 })))
      expect(mockCalculatePrice).toHaveBeenCalledWith(800, DROP.markupCents, expect.any(Number))
    })

    it("accepts boundary value of 5000", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 5000 })))
      expect(mockCalculatePrice).toHaveBeenCalledWith(5000, DROP.markupCents, expect.any(Number))
    })
  })

  describe("happy path", () => {
    it("returns 200 with checkout URL", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.url).toBe("https://checkout.stripe.com/session")
    })

    it("stores fulfillmentCents in Stripe session metadata", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody({ fulfillmentCents: 1350 })))
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ fulfillmentCents: "1350" }),
        }),
      )
    })

    it("passes shippingCents derived from selectedRate.rate to metadata", async () => {
      const { POST } = await import("@/app/api/checkout/route")
      await POST(makeRequest(validBody()))
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ shippingCents: "599" }),
        }),
      )
    })
  })
})
