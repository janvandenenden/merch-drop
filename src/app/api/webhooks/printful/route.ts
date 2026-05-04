import { createHmac, timingSafeEqual } from "node:crypto"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"

const signatureHeader = "x-pf-webhook-signature"

const packageShippedSchema = z.object({
  type: z.literal("package_shipped"),
  data: z.object({
    shipment: z.object({
      tracking_number: z.union([z.string(), z.number()]),
    }),
    order: z.object({
      id: z.union([z.string(), z.number()]),
    }),
  }),
})

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get(signatureHeader)

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  if (!verifyPrintfulSignature(body, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!isObjectWithType(payload) || payload.type !== "package_shipped") {
    return NextResponse.json({ received: true })
  }

  const parsed = packageShippedSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  await handlePackageShipped(parsed.data)

  return NextResponse.json({ received: true })
}

function isObjectWithType(value: unknown): value is { type: unknown } {
  return typeof value === "object" && value !== null && "type" in value
}

function verifyPrintfulSignature(body: string, signature: string, secret: string) {
  const expectedSignature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(body)
    .digest("hex")
  const actualSignature = signature.replace(/^sha256=/, "")

  const expected = Buffer.from(expectedSignature, "hex")
  const actual = Buffer.from(actualSignature, "hex")

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

async function handlePackageShipped(payload: z.infer<typeof packageShippedSchema>) {
  const printfulOrderId = String(payload.data.order.id)
  const trackingNumber = String(payload.data.shipment.tracking_number)

  const existingOrder = await db.query.order.findFirst({
    where: eq(order.printfulOrderId, printfulOrderId),
  })

  if (!existingOrder) return
  if (existingOrder.status === "shipped" && existingOrder.trackingNumber === trackingNumber) {
    return
  }

  await db
    .update(order)
    .set({ status: "shipped", trackingNumber, shippingEmailSentAt: new Date() })
    .where(eq(order.id, existingOrder.id))
}
