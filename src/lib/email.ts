import { Resend } from "resend"
import { db } from "@/lib/db"
import { emailLog } from "@/lib/db/schema"

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing env: RESEND_API_KEY")
}
if (!process.env.EMAIL_FROM) {
  throw new Error("Missing env: EMAIL_FROM")
}

const resend = new Resend(process.env.RESEND_API_KEY)

const DEV_MODE = process.env.EMAIL_DEV_MODE === "true"
export const EMAIL_FROM = process.env.EMAIL_FROM

type Template =
  | "order_confirmation_buyer"
  | "order_notification_creator"
  | "order_shipped_buyer"
  | "order_cancelled_buyer"
  | "order_cancelled_creator"

type EmailPayload = {
  to: string
  subject: string
  text: string
  template: Template
  orderId?: string
}

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string; from?: string }) {
  if (DEV_MODE) {
    console.log(`[EMAIL DEV MODE] to=${to}\n${text}`)
    return
  }
  await resend.emails.send({ from: EMAIL_FROM, to, subject, text })
}

async function sendTrackedEmail({ to, subject, text, template, orderId }: EmailPayload) {
  if (DEV_MODE) {
    console.log(`[EMAIL DEV MODE] template=${template} to=${to}\n${text}`)
    await db.insert(emailLog).values({ orderId: orderId ?? null, template, recipient: to })
    return
  }

  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, text })
    await db.insert(emailLog).values({ orderId: orderId ?? null, template, recipient: to })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await db.insert(emailLog).values({ orderId: orderId ?? null, template, recipient: to, error })
    throw err
  }
}

export async function sendOrderConfirmationBuyer({
  to,
  orderId,
  orderNumber,
  dropTitle,
  storeName,
  items,
  totalCents,
  supportEmail,
}: {
  to: string
  orderId: string
  orderNumber: string
  dropTitle: string
  storeName: string
  items: { size: string; quantity: number }[]
  totalCents: number
  supportEmail: string
}) {
  const total = (totalCents / 100).toFixed(2)
  const itemLines = items.map((i) => `  ${i.size} × ${i.quantity}`)
  await sendTrackedEmail({
    to,
    subject: `Order confirmed — ${dropTitle} by ${storeName}`,
    text: [
      `Thanks for your order!`,
      ``,
      `Store: ${storeName}`,
      `Drop: ${dropTitle}`,
      `Order #: ${orderNumber}`,
      `Items:`,
      ...itemLines,
      `Total: $${total}`,
      ``,
      `We'll email you again when your order ships.`,
      ``,
      `Questions? Reply to this email or contact ${supportEmail}.`,
    ].join("\n"),
    template: "order_confirmation_buyer",
    orderId,
  })
}

export async function sendOrderNotificationCreator({
  to,
  orderId,
  orderNumber,
  dropTitle,
  buyerEmail,
  items,
  totalCents,
  dashboardUrl,
}: {
  to: string
  orderId: string
  orderNumber: string
  dropTitle: string
  buyerEmail: string
  items: { size: string; quantity: number }[]
  totalCents: number
  dashboardUrl: string
}) {
  const total = (totalCents / 100).toFixed(2)
  const itemLines = items.map((i) => `  ${i.size} × ${i.quantity}`)
  await sendTrackedEmail({
    to,
    subject: `New order for "${dropTitle}"`,
    text: [
      `You have a new order!`,
      ``,
      `Drop: ${dropTitle}`,
      `Order #: ${orderNumber}`,
      `Buyer: ${buyerEmail}`,
      `Items:`,
      ...itemLines,
      `Total: $${total}`,
      ``,
      `View order: ${dashboardUrl}`,
    ].join("\n"),
    template: "order_notification_creator",
    orderId,
  })
}

export async function sendOrderShippingBuyer({
  to,
  orderId,
  dropTitle,
  storeName,
  trackingNumber,
  supportEmail,
}: {
  to: string
  orderId: string
  dropTitle: string
  storeName: string
  trackingNumber: string | null
  supportEmail: string
}) {
  const trackingLine = trackingNumber
    ? `Tracking number: ${trackingNumber}`
    : `Tracking info is not available yet. Check back soon.`

  await sendTrackedEmail({
    to,
    subject: `Your order has shipped — ${dropTitle} by ${storeName}`,
    text: [
      `Good news — your order is on its way!`,
      ``,
      `Store: ${storeName}`,
      `Drop: ${dropTitle}`,
      ``,
      trackingLine,
      ``,
      `Questions? Reply to this email or contact ${supportEmail}.`,
    ].join("\n"),
    template: "order_shipped_buyer",
    orderId,
  })
}

export async function sendOrderCancelledBuyer(to: string, dropTitle: string, orderId?: string) {
  await sendTrackedEmail({
    to,
    subject: `Your order for "${dropTitle}" has been cancelled`,
    text: [
      `We're sorry, but your order for "${dropTitle}" could not be fulfilled by our print partner.`,
      ``,
      `A full refund has been issued and should appear within 5–10 business days depending on your bank.`,
      ``,
      `If you have questions, reply to this email.`,
    ].join("\n"),
    template: "order_cancelled_buyer",
    orderId,
  })
}

export async function sendOrderCancelledCreator(to: string, dropTitle: string, orderId?: string) {
  await sendTrackedEmail({
    to,
    subject: `Order cancelled for your drop "${dropTitle}"`,
    text: [
      `An order for your drop "${dropTitle}" was rejected by our print partner and has been cancelled.`,
      ``,
      `A full refund has been issued to the buyer. Please review your print file in the Drop Manager. If this keeps happening, contact support.`,
    ].join("\n"),
    template: "order_cancelled_creator",
    orderId,
  })
}
