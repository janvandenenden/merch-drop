import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockInsertReturning = vi.fn()
const mockUpdateReturning = vi.fn()

const mockInsert = vi.fn(() => ({ values: vi.fn(() => ({ returning: mockInsertReturning })) }))
const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: mockUpdateReturning })) })) }))

vi.mock("../lib/db", () => ({
  db: {
    query: { drop: { findFirst: mockFindFirst, findMany: mockFindMany } },
    insert: mockInsert,
    update: mockUpdate,
  },
}))

// ─── Slug mock ────────────────────────────────────────────────────────────────

const mockGenerateSlug = vi.fn((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
const mockEnsureUniqueSlug = vi.fn((_userId: string, slug: string) => Promise.resolve(slug))

vi.mock("../lib/slugs", () => ({
  generateSlug: mockGenerateSlug,
  ensureUniqueSlug: mockEnsureUniqueSlug,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDrop(overrides: Record<string, unknown> = {}) {
  return {
    id: "drop-1",
    userId: "user-1",
    slug: "my-drop",
    title: "My Drop",
    description: null,
    supportEmail: "support@example.com",
    markupCents: 500,
    shirtColor: "white",
    status: "ready",
    designFileKey: null,
    printFileKey: null,
    mockupUrl: null,
    placement: null,
    firstSaleAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateSlug.mockImplementation((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
  mockEnsureUniqueSlug.mockImplementation((_userId: string, slug: string) => Promise.resolve(slug))
})

// ─── createDrop ───────────────────────────────────────────────────────────────

describe("createDrop", () => {
  it("auto-generates slug from title", async () => {
    const created = makeDrop()
    mockInsertReturning.mockResolvedValue([created])

    const { createDrop } = await import("../lib/drops")
    await createDrop({ userId: "user-1", title: "My Drop", supportEmail: "s@x.com", markupCents: 500 })

    expect(mockGenerateSlug).toHaveBeenCalledWith("My Drop")
    expect(mockEnsureUniqueSlug).toHaveBeenCalledWith("user-1", "my-drop", expect.anything())
  })

  it("uses provided slug instead of generating one", async () => {
    mockInsertReturning.mockResolvedValue([makeDrop({ slug: "custom" })])

    const { createDrop } = await import("../lib/drops")
    await createDrop({ userId: "user-1", title: "My Drop", slug: "custom", supportEmail: "s@x.com", markupCents: 500 })

    expect(mockGenerateSlug).not.toHaveBeenCalled()
    expect(mockEnsureUniqueSlug).toHaveBeenCalledWith("user-1", "custom", expect.anything())
  })

  it("appends suffix on slug collision", async () => {
    mockEnsureUniqueSlug.mockResolvedValue("my-drop-1")
    mockInsertReturning.mockResolvedValue([makeDrop({ slug: "my-drop-1" })])

    const { createDrop } = await import("../lib/drops")
    const result = await createDrop({ userId: "user-1", title: "My Drop", supportEmail: "s@x.com", markupCents: 500 })

    expect(result.slug).toBe("my-drop-1")
  })

  it("defaults shirtColor to white", async () => {
    mockInsertReturning.mockResolvedValue([makeDrop()])

    const { createDrop } = await import("../lib/drops")
    await createDrop({ userId: "user-1", title: "My Drop", supportEmail: "s@x.com", markupCents: 500 })

    const insertValues = mockInsert.mock.results[0].value.values.mock.calls[0][0]
    expect(insertValues.shirtColor).toBe("white")
  })

  it("returns the created drop", async () => {
    const created = makeDrop()
    mockInsertReturning.mockResolvedValue([created])

    const { createDrop } = await import("../lib/drops")
    const result = await createDrop({ userId: "user-1", title: "My Drop", supportEmail: "s@x.com", markupCents: 500 })

    expect(result).toEqual(created)
  })
})

// ─── getDrop ──────────────────────────────────────────────────────────────────

describe("getDrop", () => {
  it("returns drop when found", async () => {
    const record = makeDrop()
    mockFindFirst.mockResolvedValue(record)

    const { getDrop } = await import("../lib/drops")
    expect(await getDrop("drop-1")).toEqual(record)
  })

  it("returns null when not found", async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const { getDrop } = await import("../lib/drops")
    expect(await getDrop("missing")).toBeNull()
  })
})

// ─── listDrops ────────────────────────────────────────────────────────────────

describe("listDrops", () => {
  it("returns all drops for user", async () => {
    const drops = [makeDrop(), makeDrop({ id: "drop-2", slug: "drop-2" })]
    mockFindMany.mockResolvedValue(drops)

    const { listDrops } = await import("../lib/drops")
    expect(await listDrops("user-1")).toEqual(drops)
  })
})

// ─── updateDrop — status transitions ─────────────────────────────────────────

describe("updateDrop — status transitions", () => {
  it("allows ready → live", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ status: "ready" }))
    mockUpdateReturning.mockResolvedValue([makeDrop({ status: "live" })])

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { status: "live" })).resolves.toBeDefined()
  })

  it("allows live → closed", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ status: "live" }))
    mockUpdateReturning.mockResolvedValue([makeDrop({ status: "closed" })])

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { status: "closed" })).resolves.toBeDefined()
  })

  it("rejects ready → closed", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ status: "ready" }))

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { status: "closed" })).rejects.toThrow("Invalid status transition")
  })

  it("rejects live → ready", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ status: "live" }))

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { status: "ready" })).rejects.toThrow("Invalid status transition")
  })

  it("rejects closed → live", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ status: "closed" }))

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { status: "live" })).rejects.toThrow("Invalid status transition")
  })
})

// ─── updateDrop — lock after first sale ──────────────────────────────────────

describe("updateDrop — lock enforcement after firstSaleAt", () => {
  const lockedFields: [string, Record<string, unknown>][] = [
    ["markupCents", { markupCents: 999 }],
    ["shirtColor", { shirtColor: "black" }],
    ["designFileKey", { designFileKey: "designs/new.png" }],
    ["printFileKey", { printFileKey: "print-files/new.png" }],
    ["placement", { placement: { x: 0, y: 0, scale: 1 } }],
  ]

  for (const [field, update] of lockedFields) {
    it(`rejects ${field} change after first sale`, async () => {
      mockFindFirst.mockResolvedValue(makeDrop({ firstSaleAt: new Date() }))

      const { updateDrop } = await import("../lib/drops")
      await expect(updateDrop("drop-1", update)).rejects.toThrow(`Cannot change ${field} after first sale`)
    })
  }

  it("allows non-locked field change after first sale", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ firstSaleAt: new Date() }))
    mockUpdateReturning.mockResolvedValue([makeDrop({ description: "Updated" })])

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("drop-1", { description: "Updated" })).resolves.toBeDefined()
  })
})

// ─── updateDrop — slug uniqueness ─────────────────────────────────────────────

describe("updateDrop — slug uniqueness", () => {
  it("checks uniqueness when slug changes", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ slug: "old-slug" }))
    mockEnsureUniqueSlug.mockResolvedValue("new-slug")
    mockUpdateReturning.mockResolvedValue([makeDrop({ slug: "new-slug" })])

    const { updateDrop } = await import("../lib/drops")
    await updateDrop("drop-1", { slug: "new-slug" })

    expect(mockEnsureUniqueSlug).toHaveBeenCalledWith("user-1", "new-slug", expect.anything())
  })

  it("skips uniqueness check when slug unchanged", async () => {
    mockFindFirst.mockResolvedValue(makeDrop({ slug: "my-drop" }))
    mockUpdateReturning.mockResolvedValue([makeDrop()])

    const { updateDrop } = await import("../lib/drops")
    await updateDrop("drop-1", { slug: "my-drop" })

    expect(mockEnsureUniqueSlug).not.toHaveBeenCalled()
  })
})

// ─── updateDrop — not found ───────────────────────────────────────────────────

describe("updateDrop — not found", () => {
  it("throws if drop does not exist", async () => {
    mockFindFirst.mockResolvedValue(undefined)

    const { updateDrop } = await import("../lib/drops")
    await expect(updateDrop("missing", { title: "x" })).rejects.toThrow("Drop not found")
  })
})
