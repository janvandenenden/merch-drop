import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const DEV_MODE = process.env.EMAIL_DEV_MODE === "true"
export const EMAIL_FROM = process.env.EMAIL_FROM ?? "Merch Drop <noreply@resend.dev>"

type EmailPayload = {
  from: string
  to: string
  subject: string
  text: string
}

export async function sendEmail(payload: EmailPayload) {
  if (DEV_MODE) {
    console.log("[EMAIL DEV MODE]\n" + JSON.stringify(payload, null, 2))
    return
  }
  await resend.emails.send(payload)
}

export async function sendOrderCancelledBuyer(to: string, dropTitle: string) {
  await sendEmail({
    from: EMAIL_FROM,
    to,
    subject: `Your order for "${dropTitle}" has been cancelled`,
    text: `We're sorry, but your order for "${dropTitle}" could not be fulfilled by our print partner.\n\nA full refund has been issued and should appear within 5–10 business days depending on your bank.\n\nIf you have questions, reply to this email.`,
  })
}

export async function sendOrderCancelledCreator(to: string, dropTitle: string) {
  await sendEmail({
    from: EMAIL_FROM,
    to,
    subject: `Order cancelled for your drop "${dropTitle}"`,
    text: `An order for your drop "${dropTitle}" was rejected by our print partner and has been cancelled.\n\nA full refund has been issued to the buyer. Please review your print file in the Drop Manager. If this keeps happening, contact support.`,
  })
}
