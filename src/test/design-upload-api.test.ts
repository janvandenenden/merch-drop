// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetSession = vi.fn()
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}))

const mockGetDrop = vi.fn()
const mockUpdateDrop = vi.fn()
vi.mock("@/lib/drops", () => ({
  getDrop: mockGetDrop,
  updateDrop: mockUpdateDrop,
}))

const mockUploadFile = vi.fn()
vi.mock("@/lib/storage", () => ({
  uploadFile: mockUploadFile,
  storageKeys: { design: (id: string) => `designs/${id}` },
}))

vi.mock("next/headers", () => ({
  headers: () => new Headers(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DROP_ID = "drop-abc"
const USER_ID = "user-1"

function makeDrop(overrides: Record<string, unknown> = {}) {
  return {
    id: DROP_ID,
    userId: USER_ID,
    firstSaleAt: null,
    designFileKey: null,
    ...overrides,
  }
}

function makePngFile() {
  return new File(["png-bytes"], "design.png", { type: "image/png" })
}

const validPlacement = { x: 10, y: 20, scale: 0.5, rotate: 0 }

function makeRequest(file: File | null, placement: unknown) {
  const formData = new FormData()
  if (file) formData.append("file", file)
  if (placement !== undefined) formData.append("placement", JSON.stringify(placement))
  return new Request(`http://localhost/api/drops/${DROP_ID}/design`, {
    method: "POST",
    body: formData,
  })
}

function makeParams(id = DROP_ID) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ user: { id: USER_ID } })
  mockUploadFile.mockResolvedValue(undefined)
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("POST /api/drops/[id]/design — auth", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null)
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: "Unauthorized" })
  })
})

// ─── Ownership ────────────────────────────────────────────────────────────────

describe("POST /api/drops/[id]/design — ownership", () => {
  it("returns 404 when drop not found", async () => {
    mockGetDrop.mockResolvedValue(null)
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 403 when drop belongs to another user", async () => {
    mockGetDrop.mockResolvedValue(makeDrop({ userId: "other-user" }))
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: "Forbidden" })
  })

  it("returns 409 when design is locked after first sale", async () => {
    mockGetDrop.mockResolvedValue(makeDrop({ firstSaleAt: new Date() }))
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: /locked/i })
  })
})

// ─── Input validation ─────────────────────────────────────────────────────────

describe("POST /api/drops/[id]/design — input validation", () => {
  beforeEach(() => {
    mockGetDrop.mockResolvedValue(makeDrop())
  })

  it("returns 400 when file is missing", async () => {
    const formData = new FormData()
    formData.append("placement", JSON.stringify(validPlacement))
    const req = new Request(`http://localhost/api/drops/${DROP_ID}/design`, {
      method: "POST",
      body: formData,
    })
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(req, makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: /file/i })
  })

  it("returns 400 when file is not PNG", async () => {
    const jpeg = new File(["jpg-bytes"], "photo.jpg", { type: "image/jpeg" })
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(jpeg, validPlacement), makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: /PNG/i })
  })

  it("returns 400 when placement is missing", async () => {
    const formData = new FormData()
    formData.append("file", makePngFile())
    const req = new Request(`http://localhost/api/drops/${DROP_ID}/design`, {
      method: "POST",
      body: formData,
    })
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(req, makeParams())
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: /placement/i })
  })

  it("returns 400 when placement is malformed JSON", async () => {
    const formData = new FormData()
    formData.append("file", makePngFile())
    formData.append("placement", "not-json")
    const req = new Request(`http://localhost/api/drops/${DROP_ID}/design`, {
      method: "POST",
      body: formData,
    })
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(req, makeParams())
    expect(res.status).toBe(400)
  })

  it("returns 400 when placement is missing required fields", async () => {
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), { x: 0 }), makeParams())
    expect(res.status).toBe(400)
  })

  it("returns 400 when scale is zero", async () => {
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(
      makeRequest(makePngFile(), { ...validPlacement, scale: 0 }),
      makeParams(),
    )
    expect(res.status).toBe(400)
  })
})

// ─── Success ──────────────────────────────────────────────────────────────────

describe("POST /api/drops/[id]/design — success", () => {
  beforeEach(() => {
    mockGetDrop.mockResolvedValue(makeDrop())
    mockUpdateDrop.mockResolvedValue(makeDrop({ designFileKey: `designs/${DROP_ID}` }))
  })

  it("uploads PNG to R2 under designs/ prefix", async () => {
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(mockUploadFile).toHaveBeenCalledWith(
      `designs/${DROP_ID}`,
      expect.any(Buffer),
      "image/png",
    )
  })

  it("saves designFileKey and placement on the drop", async () => {
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(mockUpdateDrop).toHaveBeenCalledWith(DROP_ID, {
      designFileKey: `designs/${DROP_ID}`,
      placement: validPlacement,
    })
  })

  it("returns 200 with designFileKey", async () => {
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ designFileKey: `designs/${DROP_ID}` })
  })

  it("returns 500 when uploadFile throws", async () => {
    mockUploadFile.mockRejectedValue(new Error("R2 unreachable"))
    const { POST } = await import("@/app/api/drops/[id]/design/route")
    const res = await POST(makeRequest(makePngFile(), validPlacement), makeParams())
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: "R2 unreachable" })
  })
})
