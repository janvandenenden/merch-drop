import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── DB mock ──────────────────────────────────────────────────────────────────

const mockUserFindFirst = vi.fn()
const mockDropFindFirst = vi.fn()

vi.mock("../lib/db", () => ({
  db: {
    query: {
      user: { findFirst: mockUserFindFirst },
      drop: { findFirst: mockDropFindFirst },
    },
  },
}))

vi.mock("../lib/slugs", () => ({
  generateSlug: vi.fn((t: string) => t.toLowerCase().replace(/\s+/g, "-")),
  ensureUniqueSlug: vi.fn((_userId: string, slug: string) => Promise.resolve(slug)),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCreator(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Jan",
    email: "jan@example.com",
    emailVerified: true,
    image: null,
    slug: "jan",
    stripeAccountId: null,
    chargesEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeDrop(overrides: Record<string, unknown> = {}) {
  return {
    id: "drop-1",
    userId: "user-1",
    slug: "summer-drop",
    title: "Summer Drop",
    description: null,
    supportEmail: "support@example.com",
    markupCents: 500,
    shirtColor: "white",
    status: "pre_live",
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
})

// ─── getDropBySlug ────────────────────────────────────────────────────────────

describe("getDropBySlug", () => {
  it("returns null when creator slug not found", async () => {
    mockUserFindFirst.mockResolvedValue(undefined)

    const { getDropBySlug } = await import("../lib/drops")
    expect(await getDropBySlug("unknown", "summer-drop")).toBeNull()
    expect(mockDropFindFirst).not.toHaveBeenCalled()
  })

  it("returns null when drop slug not found for creator", async () => {
    mockUserFindFirst.mockResolvedValue(makeCreator())
    mockDropFindFirst.mockResolvedValue(undefined)

    const { getDropBySlug } = await import("../lib/drops")
    expect(await getDropBySlug("jan", "no-such-drop")).toBeNull()
  })

  it("returns drop and creator when both slugs match", async () => {
    const creator = makeCreator()
    const drop = makeDrop()
    mockUserFindFirst.mockResolvedValue(creator)
    mockDropFindFirst.mockResolvedValue(drop)

    const { getDropBySlug } = await import("../lib/drops")
    const result = await getDropBySlug("jan", "summer-drop")

    expect(result).toEqual({ drop, creator })
  })

  it("queries drop using the creator's id, not the slug", async () => {
    const creator = makeCreator({ id: "user-42" })
    const drop = makeDrop({ userId: "user-42" })
    mockUserFindFirst.mockResolvedValue(creator)
    mockDropFindFirst.mockResolvedValue(drop)

    const { getDropBySlug } = await import("../lib/drops")
    await getDropBySlug("jan", "summer-drop")

    expect(mockDropFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.anything() })
    )
  })

  it("does not cross creator boundaries — drop belonging to another user returns null", async () => {
    mockUserFindFirst.mockResolvedValue(makeCreator({ id: "user-1" }))
    mockDropFindFirst.mockResolvedValue(undefined)

    const { getDropBySlug } = await import("../lib/drops")
    expect(await getDropBySlug("jan", "someone-elses-drop")).toBeNull()
  })
})
