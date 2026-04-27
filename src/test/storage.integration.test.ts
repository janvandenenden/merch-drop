import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSignedUrl, storageKeys, uploadFile } from "../lib/storage";

const TEST_KEY = storageKeys.design(`integration-test-${Date.now()}.txt`);
const hasEnv =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME;

describe.skipIf(!hasEnv)("R2 integration", () => {
  beforeAll(async () => {
    await uploadFile(TEST_KEY, Buffer.from("integration-test"), "text/plain");
  });

  afterAll(async () => {
    // Clean up test file
    const { DeleteObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: TEST_KEY,
      })
    );
  });

  it("uploads without error", () => {
    // passes if beforeAll didn't throw
    expect(true).toBe(true);
  });

  it("getSignedUrl returns a valid HTTPS URL", async () => {
    const url = await getSignedUrl(TEST_KEY);
    expect(url).toMatch(/^https:\/\//);
  });

  it("signed URL is fetchable", async () => {
    const url = await getSignedUrl(TEST_KEY);
    const res = await fetch(url);
    expect(res.ok).toBe(true);
    expect(await res.text()).toBe("integration-test");
  });
});
