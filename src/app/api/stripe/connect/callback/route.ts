import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user: currentUser } = session

  if (currentUser.stripeAccountId && !currentUser.chargesEnabled) {
    const account = await stripe.accounts.retrieve(currentUser.stripeAccountId)

    if (account.charges_enabled) {
      await db
        .update(user)
        .set({ chargesEnabled: true })
        .where(eq(user.id, currentUser.id))
    }
  }

  redirect("/dashboard")
}
