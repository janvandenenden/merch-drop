import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop } from "@/lib/db/schema"
import { generatePrintfulMockupUrl } from "@/lib/printful"
import { getSignedUrl, uploadFile, storageKeys } from "@/lib/storage"

// BC3001 White M — representative variant for white shirt mockup
const BC3001_WHITE_VARIANT_ID = 4012

export async function generateMockupFromPrintFile(
  printFileKey: string,
  id: string,
): Promise<{ mockupKey: string; mockupUrl: string }> {
  const printFileUrl = await getSignedUrl(printFileKey)
  const printfulUrl = await generatePrintfulMockupUrl(printFileUrl, [BC3001_WHITE_VARIANT_ID])

  const res = await fetch(printfulUrl)
  if (!res.ok) throw new Error(`Failed to fetch mockup from Printful: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const mockupKey = storageKeys.mockup(`${id}-${Date.now()}.png`)
  await uploadFile(mockupKey, buffer, "image/png")

  return { mockupKey, mockupUrl: await getSignedUrl(mockupKey) }
}

export async function generateMockup(dropId: string): Promise<string> {
  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record) throw new Error(`Drop not found: ${dropId}`)
  if (!record.printFileKey) throw new Error(`Drop has no print file: ${dropId}`)

  // After first sale, return cached mockup — never regenerate
  if (record.firstSaleAt && record.mockupKey) return getSignedUrl(record.mockupKey)

  const { mockupKey, mockupUrl } = await generateMockupFromPrintFile(record.printFileKey, dropId)
  await db.update(drop).set({ mockupKey, updatedAt: new Date() }).where(eq(drop.id, dropId))

  return mockupUrl
}
