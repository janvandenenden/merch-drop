import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop, user } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"
import { calculatePrice, BASE_SHIRT_COST_CENTS } from "@/lib/pricing"

const addressSchema = z.object({
  name: z.string().min(1),
  address1: z.string().min(1),
  city: z.string().min(1),
  stateCode: z.string().optional(),
  zip: z.string().min(1),
  countryCode: z.string().length(2),
})

const selectedRateSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.string(),
  currency: z.string(),
  minDeliveryDays: z.number().optional(),
  maxDeliveryDays: z.number().optional(),
})

const bodySchema = z.object({
  dropId: z.string().uuid(),
  size: z.enum(["S", "M", "L", "XL", "2XL"]),
  address: addressSchema,
  selectedRate: selectedRateSchema,
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

  const { dropId, size, address, selectedRate } = parsed.data

  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record || record.status !== "live") {
    return NextResponse.json({ error: "Drop not available" }, { status: 404 })
  }

  const creator = await db.query.user.findFirst({ where: eq(user.id, record.userId) })
  if (!creator?.stripeAccountId || !creator.chargesEnabled) {
    return NextResponse.json({ error: "Drop not available" }, { status: 404 })
  }

  const shippingAmountCents = Math.round(parseFloat(selectedRate.rate) * 100)
  const { buyerTotal, applicationFee, fulfillmentCents } = calculatePrice(
    BASE_SHIRT_COST_CENTS,
    record.markupCents,
    shippingAmountCents
  )

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"
  const creatorSlug = creator.slug ?? creator.id
  const dropUrl = `${baseUrl}/${creatorSlug}/${record.slug}`

  const shippingRateData = [
    {
      shipping_rate_data: {
        type: "fixed_amount" as const,
        display_name: selectedRate.name,
        fixed_amount: {
          amount: shippingAmountCents,
          currency: selectedRate.currency.toLowerCase(),
        },
        ...(selectedRate.minDeliveryDays != null
          ? {
              delivery_estimate: {
                minimum: { unit: "business_day" as const, value: selectedRate.minDeliveryDays },
                maximum: {
                  unit: "business_day" as const,
                  value: selectedRate.maxDeliveryDays ?? selectedRate.minDeliveryDays,
                },
              },
            }
          : {}),
      },
    },
  ]

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: buyerTotal,
          product_data: { name: record.title },
        },
        quantity: 1,
      },
    ],
    shipping_options: shippingRateData,
    payment_intent_data: {
      application_fee_amount: applicationFee,
      on_behalf_of: creator.stripeAccountId,
      transfer_data: { destination: creator.stripeAccountId },
    },
    metadata: {
      dropId,
      size,
      buyerName: address.name,
      address: JSON.stringify(address),
      shippingRateId: selectedRate.id,
      shippingName: selectedRate.name,
      fulfillmentCents: String(fulfillmentCents),
      shippingCents: String(shippingAmountCents),
    },
    success_url: `${dropUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: dropUrl,
  })

  return NextResponse.json({ url: session.url })
}
