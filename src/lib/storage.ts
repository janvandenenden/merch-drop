import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const SIGNED_URL_TTL_SECONDS = 3600;

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

export async function getSignedUrl(key: string): Promise<string> {
  const client = getClient();
  return awsGetSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: SIGNED_URL_TTL_SECONDS }
  );
}

export const storageKeys = {
  design: (id: string) => `designs/${id}`,
  printFile: (id: string) => `print-files/${id}`,
};
