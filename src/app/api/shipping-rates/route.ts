import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop } from "@/lib/db/schema"
import { getShippingRates, PrintfulError } from "@/lib/printful"
import { BC3001_VARIANTS } from "@/lib/variants"

const bodySchema = z.object({
  dropId: z.string().uuid(),
  size: z.enum(["S", "M", "L", "XL", "2XL"]),
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

  const { dropId, size, address } = parsed.data

  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record || record.status !== "live") {
    return NextResponse.json({ error: "Drop not available" }, { status: 404 })
  }

  const variantId = BC3001_VARIANTS[size]
  if (!variantId) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 })
  }

  try {
    const rates = await getShippingRates(
      {
        address1: address.address1,
        city: address.city,
        stateCode: address.stateCode,
        countryCode: address.countryCode,
        zip: address.zip,
      },
      [{ variantId, quantity: 1 }],
    )
    return NextResponse.json({ rates })
  } catch (err) {
    const message =
      err instanceof PrintfulError ? "Check your address and try again." : "Failed to fetch shipping rates."
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
