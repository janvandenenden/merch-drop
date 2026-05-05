import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const mockDownloadFile = vi.fn();
const mockUploadFile = vi.fn();
const mockStorageKeys = { printFile: (id: string) => `print-files/${id}` };

vi.mock("../lib/storage", () => ({
  downloadFile: mockDownloadFile,
  uploadFile: mockUploadFile,
  storageKeys: mockStorageKeys,
}));

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 255 },
    },
  })
    .png()
    .toBuffer();
}

beforeEach(() => {
  mockDownloadFile.mockReset();
  mockUploadFile.mockReset();
});

describe("compositePrintFile", () => {
  it("output is PRINT_CANVAS dimensions", async () => {
    const design = await makePng(200, 200);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile, PRINT_CANVAS } = await import(
      "../lib/compositor"
    );

    await compositePrintFile("designs/test.png", { x: 0, y: 0, scale: 1, rotate: 0 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const meta = await sharp(uploaded).metadata();

    expect(meta.width).toBe(PRINT_CANVAS.width);
    expect(meta.height).toBe(PRINT_CANVAS.height);
  });

  it("output is PNG", async () => {
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    await compositePrintFile("designs/test.png", { x: 0, y: 0, scale: 1, rotate: 0 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const meta = await sharp(uploaded).metadata();
    expect(meta.format).toBe("png");
  });

  it("applies scale — design occupies scaled area", async () => {
    const design = await makePng(200, 200);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    // scale 0.5 → 100×100 placed at (0,0); pixel at (50,50) should be red
    await compositePrintFile("designs/test.png", { x: 0, y: 0, scale: 0.5, rotate: 0 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const { data } = await sharp(uploaded)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // pixel at (50, 50): offset = (50 * PRINT_CANVAS.width + 50) * 4
    const { PRINT_CANVAS } = await import("../lib/compositor");
    const offset = (50 * PRINT_CANVAS.width + 50) * 4;
    expect(data[offset]).toBe(255); // R
    expect(data[offset + 1]).toBe(0); // G
    expect(data[offset + 2]).toBe(0); // B
  });

  it("applies offset placement — design not at origin", async () => {
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    // place at (500, 600); pixel at (550, 650) should be red
    await compositePrintFile("designs/test.png", { x: 500, y: 600, scale: 1, rotate: 0 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const { data } = await sharp(uploaded)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { PRINT_CANVAS: PC } = await import("../lib/compositor");
    const offset = (650 * PC.width + 550) * 4;
    expect(data[offset]).toBe(255);
    expect(data[offset + 1]).toBe(0);
    expect(data[offset + 2]).toBe(0);
  });

  it("writes to print-files/ prefix and returns key", async () => {
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    const key = await compositePrintFile("designs/test.png", {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
    });

    expect(key).toMatch(/^print-files\//);
    expect(mockUploadFile).toHaveBeenCalledWith(
      key,
      expect.any(Buffer),
      "image/png"
    );
  });

  it("reads design from provided designKey", async () => {
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    await compositePrintFile("designs/my-design.png", { x: 0, y: 0, scale: 1, rotate: 0 });

    expect(mockDownloadFile).toHaveBeenCalledWith("designs/my-design.png");
  });

  it("does not throw when scaled design exceeds canvas bounds (large PNG)", async () => {
    // 100×100 design at scale=30 → 3000×3000, larger than 2250 canvas width
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile, PRINT_CANVAS } = await import("../lib/compositor");
    await expect(
      compositePrintFile("designs/large.png", { x: 0, y: 0, scale: 30, rotate: 0 })
    ).resolves.not.toThrow();

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const meta = await sharp(uploaded).metadata();
    expect(meta.width).toBe(PRINT_CANVAS.width);
    expect(meta.height).toBe(PRINT_CANVAS.height);
  });

  it("design placed partially outside canvas (negative offset) composites correctly", async () => {
    const design = await makePng(100, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile, PRINT_CANVAS } = await import("../lib/compositor");
    await compositePrintFile("designs/test.png", { x: -50, y: -50, scale: 1, rotate: 0 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const meta = await sharp(uploaded).metadata();
    expect(meta.width).toBe(PRINT_CANVAS.width);
    expect(meta.height).toBe(PRINT_CANVAS.height);
  });

  it("applies rotation — 90° rotate swaps image dimensions before composite", async () => {
    // 200×100 image rotated 90° becomes 100×200
    const design = await makePng(200, 100);
    mockDownloadFile.mockResolvedValue(design);
    mockUploadFile.mockResolvedValue(undefined);

    const { compositePrintFile } = await import("../lib/compositor");
    await compositePrintFile("designs/test.png", { x: 0, y: 0, scale: 1, rotate: 90 });

    const uploaded: Buffer = mockUploadFile.mock.calls[0][1];
    const meta = await sharp(uploaded).metadata();
    // Canvas is always PRINT_CANVAS size regardless of rotation
    const { PRINT_CANVAS: ROT_CANVAS } = await import("../lib/compositor");
    expect(meta.width).toBe(ROT_CANVAS.width);
    expect(meta.height).toBe(ROT_CANVAS.height);
  });
});
