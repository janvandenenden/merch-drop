import { beforeEach, describe, expect, it, vi } from "vitest"

const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockSet = vi.fn()
const mockWhere = vi.fn()

vi.mock("../lib/db", () => ({
  db: {
    query: { drop: { findFirst: mockFindFirst } },
    update: mockUpdate,
  },
}))

const mockGetSignedUrl = vi.fn()
vi.mock("../lib/storage", () => ({ getSignedUrl: mockGetSignedUrl }))

const mockPrintfulGenerateMockup = vi.fn()
vi.mock("../lib/printful", () => ({ generateMockup: mockPrintfulGenerateMockup }))

beforeEach(() => {
  mockFindFirst.mockReset()
  mockUpdate.mockReset()
  mockSet.mockReset()
  mockWhere.mockReset()
  mockGetSignedUrl.mockReset()
  mockPrintfulGenerateMockup.mockReset()

  mockWhere.mockResolvedValue(undefined)
  mockSet.mockReturnValue({ where: mockWhere })
  mockUpdate.mockReturnValue({ set: mockSet })
})

describe("generateMockup", () => {
  it("throws if drop not found", async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const { generateMockup } = await import("../lib/mockup")
    await expect(generateMockup("missing-id")).rejects.toThrow("Drop not found")
  })

  it("throws if printFileKey is missing", async () => {
    mockFindFirst.mockResolvedValue({ id: "1", printFileKey: null, firstSaleAt: null, mockupUrl: null })
    const { generateMockup } = await import("../lib/mockup")
    await expect(generateMockup("1")).rejects.toThrow("Drop has no print file")
  })

  it("returns cached mockupUrl after first sale", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      printFileKey: "print-files/abc",
      firstSaleAt: new Date(),
      mockupUrl: "https://cached.example.com/mockup.jpg",
    })
    const { generateMockup } = await import("../lib/mockup")
    const url = await generateMockup("1")
    expect(url).toBe("https://cached.example.com/mockup.jpg")
    expect(mockPrintfulGenerateMockup).not.toHaveBeenCalled()
  })

  it("generates fresh mockup when no firstSaleAt", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      printFileKey: "print-files/abc",
      firstSaleAt: null,
      mockupUrl: "https://stale.example.com/old.jpg",
    })
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/print.png")
    mockPrintfulGenerateMockup.mockResolvedValue("https://printful.example.com/new.jpg")

    const { generateMockup } = await import("../lib/mockup")
    const url = await generateMockup("1")

    expect(mockGetSignedUrl).toHaveBeenCalledWith("print-files/abc")
    expect(mockPrintfulGenerateMockup).toHaveBeenCalledWith("https://signed.example.com/print.png", [4012])
    expect(url).toBe("https://printful.example.com/new.jpg")
  })

  it("stores returned mockupUrl on the drop record", async () => {
    mockFindFirst.mockResolvedValue({
      id: "drop-42",
      printFileKey: "print-files/xyz",
      firstSaleAt: null,
      mockupUrl: null,
    })
    mockGetSignedUrl.mockResolvedValue("https://signed.example.com/print.png")
    mockPrintfulGenerateMockup.mockResolvedValue("https://printful.example.com/mockup.jpg")

    const { generateMockup } = await import("../lib/mockup")
    await generateMockup("drop-42")

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ mockupUrl: "https://printful.example.com/mockup.jpg" }),
    )
  })
})
