import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { user, drop, order } from "@/lib/db/schema"
import { submitOrder } from "@/lib/printful"
import { getSignedUrl } from "@/lib/storage"
import { BC3001_VARIANTS } from "@/lib/variants"
import { sendOrderCancelledBuyer, sendOrderCancelledCreator } from "@/lib/email"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "account.updated") {
    await handleAccountUpdated(event.data.object as Stripe.Account)
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}

async function handleAccountUpdated(account: Stripe.Account) {
  if (!account.charges_enabled) return

  const [creator] = await db
    .select()
    .from(user)
    .where(eq(user.stripeAccountId, account.id))
    .limit(1)

  if (!creator || creator.chargesEnabled) return

  await db.update(user).set({ chargesEnabled: true }).where(eq(user.id, creator.id))
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { dropId, size, address: addressJson, buyerName, fulfillmentCents, shippingCents } = session.metadata ?? {}
  if (!dropId || !size || !addressJson) return

  const buyerEmail = session.customer_details?.email ?? ""
  const totalCents = session.amount_total ?? 0

  // Idempotency: skip if order already recorded
  const existing = await db.query.order.findFirst({
    where: eq(order.stripeSessionId, session.id),
  })
  if (existing) return

  const record = await db.query.drop.findFirst({ where: eq(drop.id, dropId) })
  if (!record) return

  const shippingAddress = JSON.parse(addressJson) as {
    name: string
    address1: string
    city: string
    stateCode?: string
    zip: string
    countryCode: string
  }

  const [newOrder] = await db
    .insert(order)
    .values({
      dropId,
      stripeSessionId: session.id,
      status: "paid",
      size,
      shippingAddress,
      buyerEmail,
      totalCents,
      markupCents: record.markupCents,
      fulfillmentCents: Number(fulfillmentCents ?? 0),
      shippingCents: Number(shippingCents ?? 0),
    })
    .returning()

  // Mark first sale — triggers price/design lock on the drop
  if (!record.firstSaleAt) {
    await db
      .update(drop)
      .set({ firstSaleAt: new Date(), updatedAt: new Date() })
      .where(eq(drop.id, dropId))
  }

  if (!record.printFileKey) return

  const variantId = BC3001_VARIANTS[size]
  if (!variantId) return

  const printFileUrl = await getSignedUrl(record.printFileKey)

  try {
    const printfulOrder = await submitOrder({
      recipient: {
        name: buyerName ?? shippingAddress.name,
        email: buyerEmail,
        address1: shippingAddress.address1,
        city: shippingAddress.city,
        stateCode: shippingAddress.stateCode,
        countryCode: shippingAddress.countryCode,
        zip: shippingAddress.zip,
      },
      items: [{ variantId, quantity: 1, printFileUrl }],
    })

    await db
      .update(order)
      .set({ status: "submitted", printfulOrderId: String(printfulOrder.id) })
      .where(eq(order.id, newOrder.id))
  } catch {
    await handlePrintfulRejection(session, newOrder.id, record, buyerEmail)
  }
}

async function handlePrintfulRejection(
  session: Stripe.Checkout.Session,
  orderId: string,
  dropRecord: { userId: string; title: string },
  buyerEmail: string,
) {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id

  if (paymentIntentId) {
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reverse_transfer: true,
        refund_application_fee: true,
      })
    } catch {
      // Refund failure should not block cancellation or notifications
    }
  }

  await db.update(order).set({ status: "cancelled" }).where(eq(order.id, orderId))

  const [creator] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, dropRecord.userId))
    .limit(1)

  await Promise.allSettled([
    sendOrderCancelledBuyer(buyerEmail, dropRecord.title),
    creator
      ? sendOrderCancelledCreator(creator.email, dropRecord.title)
      : Promise.resolve(),
  ])
}
