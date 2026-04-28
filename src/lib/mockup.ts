import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop } from "@/lib/db/schema"
import { generateMockup as printfulGenerateMockup } from "@/lib/printful"
import { getSignedUrl } from "@/lib/storage"

// BC3001 White M — representative variant for white shirt mockup
const BC3001_WHITE_VARIANT_ID = 4012

export async function generateMockup(dropId: string): Promise<string> {
  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record) throw new Error(`Drop not found: ${dropId}`)
  if (!record.printFileKey) throw new Error(`Drop has no print file: ${dropId}`)

  // After first sale, return cached mockup — never regenerate
  if (record.firstSaleAt && record.mockupUrl) return record.mockupUrl

  const printFileUrl = await getSignedUrl(record.printFileKey)
  const mockupUrl = await printfulGenerateMockup(printFileUrl, [BC3001_WHITE_VARIANT_ID])

  await db.update(drop).set({ mockupUrl, updatedAt: new Date() }).where(eq(drop.id, dropId))

  return mockupUrl
}
