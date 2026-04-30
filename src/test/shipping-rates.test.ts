import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn()

vi.mock("@/lib/db", () => ({
  db: { query: { drop: { findFirst: mockFindFirst } } },
}))

vi.mock("@/lib/db/schema", () => ({ drop: "drop-table" }))

const mockGetSignedUrl = vi.fn()
vi.mock("@/lib/storage", () => ({ getSignedUrl: mockGetSignedUrl }))

const mockGetShippingRates = vi.fn()
const mockEstimateOrderCost = vi.fn()
vi.mock("@/lib/printful", () => ({
  getShippingRates: mockGetShippingRates,
  estimateOrderCost: mockEstimateOrderCost,
  PrintfulError: class PrintfulError extends Error {
    constructor(
      public code: number,
      public reason: string,
      message: string,
    ) {
      super(message)
    }
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DROP_ID = "123e4567-e89b-12d3-a456-426614174000"
const PRINT_FILE_URL = "https://example.com/print.png"
const DROP = { id: DROP_ID, status: "live", printFileKey: "designs/test.png" }

const RATES = [
  { id: "STANDARD", name: "Standard", rate: "5.99", currency: "USD", minDeliveryDays: 3, maxDeliveryDays: 5 },
]

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/shipping-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    dropId: DROP_ID,
    size: "M",
    address: {
      name: "Jane Doe",
      address1: "1 Main St",
      city: "Portland",
      stateCode: "OR",
      zip: "97201",
      countryCode: "US",
    },
    ...overrides,
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockFindFirst.mockResolvedValue(DROP)
  mockGetSignedUrl.mockResolvedValue(PRINT_FILE_URL)
  mockGetShippingRates.mockResolvedValue(RATES)
  mockEstimateOrderCost.mockResolvedValue(1350)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/shipping-rates", () => {
  describe("validation", () => {
    it("returns 400 on missing dropId", async () => {
      const { POST } = await import("@/app/api/shipping-rates/route")
      const body = validBody()
      delete (body as Record<string, unknown>).dropId
      const res = await POST(makeRequest(body))
      expect(res.status).toBe(400)
    })

    it("returns 400 on invalid size", async () => {
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody({ size: "XXXL" })))
      expect(res.status).toBe(400)
    })

    it("returns 404 when drop not found", async () => {
      mockFindFirst.mockResolvedValue(null)
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(404)
    })

    it("returns 404 when drop is not live", async () => {
      mockFindFirst.mockResolvedValue({ ...DROP, status: "paused" })
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(404)
    })
  })

  describe("happy path", () => {
    it("returns rates alongside fulfillmentCents", async () => {
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.rates).toEqual(RATES)
      expect(json.fulfillmentCents).toBe(1350)
    })

    it("calls both getShippingRates and estimateOrderCost", async () => {
      const { POST } = await import("@/app/api/shipping-rates/route")
      await POST(makeRequest(validBody()))
      expect(mockGetShippingRates).toHaveBeenCalledOnce()
      expect(mockEstimateOrderCost).toHaveBeenCalledOnce()
    })

    it("passes the same address to both Printful calls", async () => {
      const { POST } = await import("@/app/api/shipping-rates/route")
      await POST(makeRequest(validBody()))
      const ratesAddr = mockGetShippingRates.mock.calls[0][0]
      const estimateAddr = mockEstimateOrderCost.mock.calls[0][0]
      expect(ratesAddr).toEqual(estimateAddr)
    })
  })

  describe("error handling", () => {
    it("returns 422 when Printful throws PrintfulError", async () => {
      const { PrintfulError } = await import("@/lib/printful")
      mockGetShippingRates.mockRejectedValue(new PrintfulError(400, "bad_address", "Invalid address"))
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toContain("address")
    })

    it("returns 422 with generic message on unknown error", async () => {
      mockGetShippingRates.mockRejectedValue(new Error("network failure"))
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(422)
      const json = await res.json()
      expect(json.error).toContain("shipping rates")
    })

    it("falls back to BASE_SHIRT_COST_CENTS when estimateOrderCost fails", async () => {
      const { PrintfulError } = await import("@/lib/printful")
      mockEstimateOrderCost.mockRejectedValue(new PrintfulError(404, "NotFound", "Not found"))
      const { POST } = await import("@/app/api/shipping-rates/route")
      const res = await POST(makeRequest(validBody()))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.rates).toEqual(RATES)
      expect(json.fulfillmentCents).toBe(1200)
    })
  })
})
