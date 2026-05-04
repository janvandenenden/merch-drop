import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockConstructEvent = vi.fn()
const mockRefundsCreate = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    refunds: { create: mockRefundsCreate },
  },
}))

const mockFindFirstOrder = vi.fn()
const mockFindFirstDrop = vi.fn()
const mockInsertOrder = vi.fn()
const mockInsertValues = vi.fn()
const mockUpdateDrop = vi.fn()
const mockUpdateOrder = vi.fn()
const mockUpdateOrderSet = vi.fn(() => ({ where: mockUpdateOrder }))
const mockSelectUser = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      order: { findFirst: mockFindFirstOrder },
      drop: { findFirst: mockFindFirstDrop },
    },
    insert: () => ({ values: mockInsertValues }),
    update: (table: unknown) => ({
      set: table === "order-table"
        ? mockUpdateOrderSet
        : () => ({ where: mockUpdateDrop }),
    }),
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectUser }) }) }),
  },
}))

// update() needs to distinguish drop vs order table — override with targeted mock
vi.mock("@/lib/db/schema", () => ({
  user: "user-table",
  drop: "drop-table",
  order: "order-table",
}))

const mockSubmitOrder = vi.fn()
vi.mock("@/lib/printful", () => ({ submitOrder: mockSubmitOrder }))

const mockGetSignedUrl = vi.fn()
vi.mock("@/lib/storage", () => ({ getSignedUrl: mockGetSignedUrl }))

const mockSendBuyer = vi.fn()
const mockSendCreator = vi.fn()
const mockSendConfirmationBuyer = vi.fn()
const mockSendNotificationCreator = vi.fn()
vi.mock("@/lib/email", () => ({
  sendOrderCancelledBuyer: mockSendBuyer,
  sendOrderCancelledCreator: mockSendCreator,
  sendOrderConfirmationBuyer: mockSendConfirmationBuyer,
  sendOrderNotificationCreator: mockSendNotificationCreator,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADDRESS = { name: "Jane Doe", address1: "1 Main St", city: "Portland", stateCode: "OR", zip: "97201", countryCode: "US" }

const SESSION = {
  id: "cs_test_abc",
  payment_intent: "pi_test_abc",
  amount_total: 2500,
  customer_details: { email: "buyer@example.com" },
  metadata: {
    dropId: "drop-uuid-1",
    size: "M",
    buyerName: "Jane Doe",
    address: JSON.stringify(ADDRESS),
    fulfillmentCents: "1200",
    shippingCents: "800",
  },
}

const DROP_RECORD = {
  id: "drop-uuid-1",
  userId: "user-1",
  title: "Summer Drop",
  markupCents: 1000,
  printFileKey: "prints/drop-uuid-1.pdf",
  firstSaleAt: null,
  supportEmail: "support@example.com",
}

const NEW_ORDER = { id: "order-uuid-1" }

function makeWebhookRequest(eventType: string, sessionOverride?: Partial<typeof SESSION>) {
  const session = { ...SESSION, ...sessionOverride }
  const event = { type: eventType, data: { object: session } }
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: JSON.stringify(event),
  })
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"

  mockConstructEvent.mockImplementation((_body, _sig, _secret) => {
    const parsed = JSON.parse(_body as string)
    return parsed
  })

  mockFindFirstOrder.mockResolvedValue(null)
  mockFindFirstDrop.mockResolvedValue(DROP_RECORD)
  mockInsertValues.mockReturnValue({ returning: mockInsertOrder })
  mockInsertOrder.mockResolvedValue([NEW_ORDER])
  mockUpdateDrop.mockResolvedValue(undefined)
  mockUpdateOrder.mockResolvedValue(undefined)
  mockUpdateOrderSet.mockReturnValue({ where: mockUpdateOrder })
  mockSelectUser.mockResolvedValue([{ email: "creator@example.com", name: "Jan Store" }])
  mockGetSignedUrl.mockResolvedValue("https://r2.example.com/print.pdf")
  mockRefundsCreate.mockResolvedValue({ id: "re_test_abc" })
  mockSendBuyer.mockResolvedValue(undefined)
  mockSendCreator.mockResolvedValue(undefined)
  mockSendConfirmationBuyer.mockResolvedValue(undefined)
  mockSendNotificationCreator.mockResolvedValue(undefined)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook", () => {
  describe("checkout.session.completed — happy path", () => {
    it("creates order with status paid and submits to Printful", async () => {
      mockSubmitOrder.mockResolvedValue({ id: 99, status: "pending", recipient: {}, items: [] })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      const res = await POST(makeWebhookRequest("checkout.session.completed"))

      expect(res.status).toBe(200)
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({ fulfillmentCents: 1200, shippingCents: 800 }),
      )
      expect(mockSubmitOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: expect.objectContaining({ email: "buyer@example.com" }),
          items: expect.arrayContaining([
            expect.objectContaining({ quantity: 1 }),
          ]),
        }),
      )
    })

    it("sets firstSaleAt when drop has no prior sales", async () => {
      mockSubmitOrder.mockResolvedValue({ id: 99, status: "pending", recipient: {}, items: [] })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockUpdateDrop).toHaveBeenCalled()
    })

    it("sends buyer confirmation email on paid", async () => {
      mockSubmitOrder.mockResolvedValue({ id: 99, status: "pending", recipient: {}, items: [] })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockSendConfirmationBuyer).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          dropTitle: "Summer Drop",
          storeName: "Jan Store",
          size: "M",
          totalCents: 2500,
          supportEmail: "support@example.com",
        }),
      )
    })

    it("sends creator notification email on paid", async () => {
      mockSubmitOrder.mockResolvedValue({ id: 99, status: "pending", recipient: {}, items: [] })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockSendNotificationCreator).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "creator@example.com",
          dropTitle: "Summer Drop",
          buyerEmail: "buyer@example.com",
          size: "M",
          totalCents: 2500,
        }),
      )
    })

    it("does not set firstSaleAt when already set", async () => {
      mockFindFirstDrop.mockResolvedValue({ ...DROP_RECORD, firstSaleAt: new Date() })
      mockSubmitOrder.mockResolvedValue({ id: 99, status: "pending", recipient: {}, items: [] })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockUpdateDrop).not.toHaveBeenCalled()
    })
  })

  describe("checkout.session.completed — Printful rejection", () => {
    beforeEach(() => {
      mockSubmitOrder.mockRejectedValue(new Error("Printful: invalid address"))
    })

    it("issues full refund on Printful rejection", async () => {
      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockRefundsCreate).toHaveBeenCalledWith({
        payment_intent: "pi_test_abc",
        reverse_transfer: true,
        refund_application_fee: true,
      })
    })

    it("sets order status to cancelled with cancellationReason and cancelledAt", async () => {
      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      // call[0] = confirmationEmailSentAt, call[1] = cancellation
      const setArgs = mockUpdateOrderSet.mock.calls[1]?.[0] ?? {}
      expect(setArgs).toMatchObject({
        status: "cancelled",
        cancellationReason: "printful_rejection",
      })
      expect(setArgs.cancelledAt).toBeInstanceOf(Date)
    })

    it("sets refundedAt when refund succeeds", async () => {
      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      const setArgs = mockUpdateOrderSet.mock.calls[1]?.[0] ?? {}
      expect(setArgs.refundedAt).toBeInstanceOf(Date)
    })

    it("leaves refundedAt null when refund fails", async () => {
      mockRefundsCreate.mockRejectedValue(new Error("Stripe error"))

      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      const setArgs = mockUpdateOrderSet.mock.calls[1]?.[0] ?? {}
      expect(setArgs.refundedAt).toBeNull()
    })

    it("emails buyer and creator cancellation notifications", async () => {
      const { POST } = await import("@/app/api/stripe/webhook/route")
      await POST(makeWebhookRequest("checkout.session.completed"))

      expect(mockSendBuyer).toHaveBeenCalledWith("buyer@example.com", "Summer Drop", "order-uuid-1")
      expect(mockSendCreator).toHaveBeenCalledWith("creator@example.com", "Summer Drop", "order-uuid-1")
    })

    it("still cancels order if refund call fails", async () => {
      mockRefundsCreate.mockRejectedValue(new Error("Stripe error"))

      const { POST } = await import("@/app/api/stripe/webhook/route")
      const res = await POST(makeWebhookRequest("checkout.session.completed"))

      expect(res.status).toBe(200)
      expect(mockUpdateOrder).toHaveBeenCalled()
    })
  })

  describe("idempotency", () => {
    it("returns 200 without creating duplicate order on repeated event", async () => {
      mockFindFirstOrder.mockResolvedValue({ id: "order-uuid-existing" })

      const { POST } = await import("@/app/api/stripe/webhook/route")
      const res = await POST(makeWebhookRequest("checkout.session.completed"))

      expect(res.status).toBe(200)
      expect(mockInsertOrder).not.toHaveBeenCalled()
      expect(mockSubmitOrder).not.toHaveBeenCalled()
    })
  })

  describe("signature validation", () => {
    it("returns 400 when stripe-signature header is missing", async () => {
      const req = new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      })
      const { POST } = await import("@/app/api/stripe/webhook/route")
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it("returns 400 when signature is invalid", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("No matching signature")
      })
      const { POST } = await import("@/app/api/stripe/webhook/route")
      const res = await POST(makeWebhookRequest("checkout.session.completed"))
      expect(res.status).toBe(400)
    })
  })
})
