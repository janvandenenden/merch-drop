import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function (this: { send: typeof mockSend }) {
    this.send = mockSend;
  }),
  PutObjectCommand: vi.fn().mockImplementation(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  GetObjectCommand: vi.fn().mockImplementation(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  DeleteObjectCommand: vi.fn().mockImplementation(function (this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

const ENV = {
  R2_ACCOUNT_ID: "test-account",
  R2_ACCESS_KEY_ID: "test-key-id",
  R2_SECRET_ACCESS_KEY: "test-secret",
  R2_BUCKET_NAME: "test-bucket",
};

beforeEach(() => {
  vi.resetModules();
  Object.assign(process.env, ENV);
  mockSend.mockReset();
  mockGetSignedUrl.mockReset();
});

describe("uploadFile", () => {
  it("sends PutObjectCommand with correct bucket, key, and contentType", async () => {
    mockSend.mockResolvedValue({});
    const { uploadFile } = await import("../lib/storage");
    const buf = Buffer.from("hello");

    await uploadFile("designs/abc.png", buf, "image/png");

    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "designs/abc.png",
      Body: buf,
      ContentType: "image/png",
    });
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("works for print-files/ prefix", async () => {
    mockSend.mockResolvedValue({});
    const { uploadFile } = await import("../lib/storage");

    await uploadFile("print-files/abc.png", Buffer.from("x"), "image/png");

    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "print-files/abc.png" })
    );
  });
});

describe("getSignedUrl", () => {
  it("returns signed URL from presigner", async () => {
    mockGetSignedUrl.mockResolvedValue("https://signed.url/key");
    const { getSignedUrl } = await import("../lib/storage");

    const url = await getSignedUrl("designs/abc.png");

    expect(url).toBe("https://signed.url/key");
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "designs/abc.png",
    });
  });
});

describe("storageKeys", () => {
  it("prefixes design keys correctly", async () => {
    const { storageKeys } = await import("../lib/storage");
    expect(storageKeys.design("drop-123")).toBe("designs/drop-123");
  });

  it("prefixes print-file keys correctly", async () => {
    const { storageKeys } = await import("../lib/storage");
    expect(storageKeys.printFile("drop-123")).toBe("print-files/drop-123");
  });
});
