import { createHmac } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockFindFirstOrder = vi.fn()
const mockFindFirstDrop = vi.fn()
const mockUpdateOrder = vi.fn()
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateOrder }))
const mockSelectUser = vi.fn()

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      order: { findFirst: mockFindFirstOrder },
      drop: { findFirst: mockFindFirstDrop },
    },
    update: () => ({ set: mockUpdateSet }),
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelectUser }) }) }),
  },
}))

vi.mock("@/lib/db/schema", () => ({
  order: { id: "order-id-column", printfulOrderId: "printful-order-id-column" },
  drop: { id: "drop-id-column" },
  user: "user-table",
}))

const mockSendShippingBuyer = vi.fn()
vi.mock("@/lib/email", () => ({
  sendOrderShippingBuyer: mockSendShippingBuyer,
}))

const WEBHOOK_SECRET = "0123456789abcdef0123456789abcdef"

function sign(body: string) {
  return createHmac("sha256", Buffer.from(WEBHOOK_SECRET, "hex"))
    .update(body)
    .digest("hex")
}

function makeWebhookRequest(payload: unknown, signature = sign(JSON.stringify(payload))) {
  const body = JSON.stringify(payload)

  return new Request("http://localhost/api/webhooks/printful", {
    method: "POST",
    headers: { "x-pf-webhook-signature": signature },
    body,
  })
}

const PACKAGE_SHIPPED_PAYLOAD = {
  type: "package_shipped",
  created: 1622456737,
  retries: 0,
  store: 12,
  data: {
    shipment: {
      id: 10,
      tracking_number: "0000000000",
    },
    order: {
      id: 99,
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PRINTFUL_WEBHOOK_SECRET = WEBHOOK_SECRET
  mockFindFirstOrder.mockResolvedValue({
    id: "order-uuid-1",
    dropId: "drop-uuid-1",
    buyerEmail: "buyer@example.com",
    status: "submitted",
    trackingNumber: null,
    shippingEmailSentAt: null,
  })
  mockFindFirstDrop.mockResolvedValue({
    id: "drop-uuid-1",
    userId: "user-1",
    title: "Summer Drop",
    supportEmail: "support@example.com",
  })
  mockSelectUser.mockResolvedValue([{ name: "Jan Store" }])
  mockUpdateOrder.mockResolvedValue(undefined)
  mockSendShippingBuyer.mockResolvedValue(undefined)
})

describe("POST /api/webhooks/printful", () => {
  it("marks package_shipped orders as shipped and stores tracking number", async () => {
    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD))

    expect(res.status).toBe(200)
    expect(mockFindFirstOrder).toHaveBeenCalled()
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "shipped", trackingNumber: "0000000000" }),
    )
  })

  it("sends shipping email to buyer with tracking number", async () => {
    const { POST } = await import("@/app/api/webhooks/printful/route")
    await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD))

    expect(mockSendShippingBuyer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        dropTitle: "Summer Drop",
        storeName: "Jan Store",
        trackingNumber: "0000000000",
        supportEmail: "support@example.com",
      }),
    )
  })

  it("does not send shipping email when already sent (idempotency)", async () => {
    mockFindFirstOrder.mockResolvedValue({
      id: "order-uuid-1",
      dropId: "drop-uuid-1",
      buyerEmail: "buyer@example.com",
      status: "submitted",
      trackingNumber: null,
      shippingEmailSentAt: new Date(),
    })

    const { POST } = await import("@/app/api/webhooks/printful/route")
    await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD))

    expect(mockSendShippingBuyer).not.toHaveBeenCalled()
  })

  it("does not update again when the shipment was already recorded", async () => {
    mockFindFirstOrder.mockResolvedValue({
      id: "order-uuid-1",
      dropId: "drop-uuid-1",
      buyerEmail: "buyer@example.com",
      status: "shipped",
      trackingNumber: "0000000000",
      shippingEmailSentAt: new Date(),
    })

    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD))

    expect(res.status).toBe(200)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it("ignores unknown Printful order ids without retrying the webhook", async () => {
    mockFindFirstOrder.mockResolvedValue(null)

    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD))

    expect(res.status).toBe(200)
    expect(mockUpdateSet).not.toHaveBeenCalled()
  })

  it("ignores unrelated event types", async () => {
    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(makeWebhookRequest({ type: "package_returned" }))

    expect(res.status).toBe(200)
    expect(mockFindFirstOrder).not.toHaveBeenCalled()
  })

  it("returns 400 when the signature is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/printful", {
      method: "POST",
      body: JSON.stringify(PACKAGE_SHIPPED_PAYLOAD),
    })

    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it("returns 400 when the signature is invalid", async () => {
    const { POST } = await import("@/app/api/webhooks/printful/route")
    const res = await POST(makeWebhookRequest(PACKAGE_SHIPPED_PAYLOAD, "bad"))

    expect(res.status).toBe(400)
  })
})
