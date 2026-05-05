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
const mockUploadFile = vi.fn()
vi.mock("../lib/storage", () => ({
  getSignedUrl: mockGetSignedUrl,
  uploadFile: mockUploadFile,
  storageKeys: { mockup: (id: string) => `mockups/${id}` },
}))

const mockPrintfulGenerateMockup = vi.fn()
vi.mock("../lib/printful", () => ({ generatePrintfulMockupUrl: mockPrintfulGenerateMockup }))

beforeEach(() => {
  mockFindFirst.mockReset()
  mockUpdate.mockReset()
  mockSet.mockReset()
  mockWhere.mockReset()
  mockGetSignedUrl.mockReset()
  mockUploadFile.mockReset()
  mockPrintfulGenerateMockup.mockReset()

  mockWhere.mockResolvedValue(undefined)
  mockSet.mockReturnValue({ where: mockWhere })
  mockUpdate.mockReturnValue({ set: mockSet })
  mockUploadFile.mockResolvedValue(undefined)

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }))
})

describe("generateMockup", () => {
  it("throws if drop not found", async () => {
    mockFindFirst.mockResolvedValue(undefined)
    const { generateMockup } = await import("../lib/mockup")
    await expect(generateMockup("missing-id")).rejects.toThrow("Drop not found")
  })

  it("throws if printFileKey is missing", async () => {
    mockFindFirst.mockResolvedValue({ id: "1", printFileKey: null, firstSaleAt: null, mockupKey: null })
    const { generateMockup } = await import("../lib/mockup")
    await expect(generateMockup("1")).rejects.toThrow("Drop has no print file")
  })

  it("returns cached signed url after first sale without regenerating", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      printFileKey: "print-files/abc",
      firstSaleAt: new Date(),
      mockupKey: "mockups/cached.png",
    })
    mockGetSignedUrl.mockResolvedValue("https://r2.example.com/mockups/cached.png")

    const { generateMockup } = await import("../lib/mockup")
    const url = await generateMockup("1")

    expect(url).toBe("https://r2.example.com/mockups/cached.png")
    expect(mockGetSignedUrl).toHaveBeenCalledWith("mockups/cached.png")
    expect(mockPrintfulGenerateMockup).not.toHaveBeenCalled()
  })

  it("generates fresh mockup when no firstSaleAt", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      printFileKey: "print-files/abc",
      firstSaleAt: null,
      mockupKey: null,
    })
    mockGetSignedUrl
      .mockResolvedValueOnce("https://signed.example.com/print.png")
      .mockResolvedValueOnce("https://r2.example.com/mockups/new.png")
    mockPrintfulGenerateMockup.mockResolvedValue("https://printful.example.com/new.jpg")

    const { generateMockup } = await import("../lib/mockup")
    const url = await generateMockup("1")

    expect(mockGetSignedUrl).toHaveBeenCalledWith("print-files/abc")
    expect(mockPrintfulGenerateMockup).toHaveBeenCalledWith("https://signed.example.com/print.png", [4012])
    expect(mockUploadFile).toHaveBeenCalled()
    expect(url).toBe("https://r2.example.com/mockups/new.png")
  })

  it("stores mockupKey on the drop record", async () => {
    mockFindFirst.mockResolvedValue({
      id: "drop-42",
      printFileKey: "print-files/xyz",
      firstSaleAt: null,
      mockupKey: null,
    })
    mockGetSignedUrl
      .mockResolvedValueOnce("https://signed.example.com/print.png")
      .mockResolvedValueOnce("https://r2.example.com/mockups/new.png")
    mockPrintfulGenerateMockup.mockResolvedValue("https://printful.example.com/mockup.jpg")

    const { generateMockup } = await import("../lib/mockup")
    await generateMockup("drop-42")

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ mockupKey: expect.stringMatching(/^mockups\//) }),
    )
  })
})
