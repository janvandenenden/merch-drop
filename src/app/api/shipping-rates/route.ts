import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop } from "@/lib/db/schema"
import { getShippingRates, estimateOrderCost, PrintfulError } from "@/lib/printful"
import { BC3001_VARIANTS } from "@/lib/variants"
import { getSignedUrl } from "@/lib/storage"
import { BASE_SHIRT_COST_CENTS } from "@/lib/pricing"

const bodySchema = z.object({
  dropId: z.string().uuid(),
  items: z.array(z.object({
    size: z.enum(["S", "M", "L", "XL", "2XL"]),
    quantity: z.number().int().min(1).max(10),
  })).min(1),
  address: z.object({
    name: z.string().min(1),
    address1: z.string().min(1),
    city: z.string().min(1),
    stateCode: z.string().optional(),
    zip: z.string().min(1),
    countryCode: z.string().length(2),
  }),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { dropId, items, address } = parsed.data

  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record || record.status !== "live") {
    return NextResponse.json({ error: "Drop not available" }, { status: 404 })
  }
  if (!record.printFileKey) {
    return NextResponse.json({ error: "Drop not available" }, { status: 404 })
  }
  const printFileUrl = await getSignedUrl(record.printFileKey)

  const printfulItems = items.map((item) => {
    const variantId = BC3001_VARIANTS[item.size]
    if (!variantId) throw new Error(`Invalid size: ${item.size}`)
    return { variantId, quantity: item.quantity }
  })

  const printfulAddress = {
    address1: address.address1,
    city: address.city,
    stateCode: address.stateCode,
    countryCode: address.countryCode,
    zip: address.zip,
  }

  let rates: Awaited<ReturnType<typeof getShippingRates>>
  try {
    rates = await getShippingRates(printfulAddress, printfulItems)
  } catch (err) {
    if (err instanceof PrintfulError) {
      console.error("[shipping-rates] getShippingRates failed", { code: err.code, reason: err.reason, message: err.message })
    } else {
      console.error("[shipping-rates] getShippingRates unexpected error", err)
    }
    const message = err instanceof PrintfulError ? "Check your address and try again." : "Failed to fetch shipping rates."
    return NextResponse.json({ error: message }, { status: 422 })
  }

  // Estimate per-unit fulfillment cost (all BC3001 sizes cost the same)
  let fulfillmentCents: number
  try {
    fulfillmentCents = await estimateOrderCost(printfulAddress, [{ variantId: printfulItems[0].variantId, quantity: 1 }], printFileUrl)
  } catch (err) {
    if (err instanceof PrintfulError) {
      console.error("[shipping-rates] estimateOrderCost failed, falling back to base cost", { code: err.code, reason: err.reason, message: err.message })
    } else {
      console.error("[shipping-rates] estimateOrderCost unexpected error, falling back to base cost", err)
    }
    fulfillmentCents = BASE_SHIRT_COST_CENTS
  }

  return NextResponse.json({ rates, fulfillmentCents })
}
