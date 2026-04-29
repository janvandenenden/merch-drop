import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3001"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user: currentUser } = session

  let stripeAccountId = currentUser.stripeAccountId

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: currentUser.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    stripeAccountId = account.id

    await db
      .update(user)
      .set({ stripeAccountId })
      .where(eq(user.id, currentUser.id))
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${BASE_URL}/api/stripe/connect`,
    return_url: `${BASE_URL}/api/stripe/connect/callback`,
    type: "account_onboarding",
    collection_options: { fields: "currently_due" },
  })

  redirect(accountLink.url)
}
