import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "Merch Drop <noreply@resend.dev>"

export async function sendOrderCancelledBuyer(to: string, dropTitle: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your order for "${dropTitle}" has been cancelled`,
    text: `We're sorry, but your order for "${dropTitle}" could not be fulfilled by our print partner.\n\nA full refund has been issued and should appear within 5–10 business days depending on your bank.\n\nIf you have questions, reply to this email.`,
  })
}

export async function sendOrderCancelledCreator(to: string, dropTitle: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Order cancelled for your drop "${dropTitle}"`,
    text: `An order for your drop "${dropTitle}" was rejected by our print partner and has been cancelled.\n\nA full refund has been issued to the buyer. Please review your print file in the Drop Manager. If this keeps happening, contact support.`,
  })
}
