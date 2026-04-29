import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}))

const mockCreateDrop = vi.fn()
vi.mock("@/lib/drops", () => ({
  createDrop: mockCreateDrop,
}))

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const validBody = {
  title: "Summer Drop",
  supportEmail: "support@example.com",
  markupCents: 1000,
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/drops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/drops", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null)
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: "Unauthorized" })
  })

  it("returns 400 for missing title", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest({ ...validBody, title: "" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid support email", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest({ ...validBody, supportEmail: "not-an-email" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for negative markupCents", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest({ ...validBody, markupCents: -1 }))
    expect(res.status).toBe(400)
  })

  it("creates drop and returns id", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockCreateDrop.mockResolvedValue({ id: "drop-abc" })
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "drop-abc" })
    expect(mockCreateDrop).toHaveBeenCalledWith({ userId: "user-1", status: "pre_live", ...validBody })
  })

  it("passes optional slug and description when provided", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockCreateDrop.mockResolvedValue({ id: "drop-abc" })
    const { POST } = await import("@/app/api/drops/route")
    await POST(
      makeRequest({ ...validBody, slug: "custom-slug", description: "A great drop" })
    )
    expect(mockCreateDrop).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "custom-slug", description: "A great drop" })
    )
  })

  it("returns 500 when createDrop throws", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } })
    mockCreateDrop.mockRejectedValue(new Error("DB connection failed"))
    const { POST } = await import("@/app/api/drops/route")
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: "DB connection failed" })
  })
})
