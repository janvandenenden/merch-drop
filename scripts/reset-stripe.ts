/**
 * Resets Stripe Connect status for a creator so you can re-run the
 * "Enable checkout" onboarding flow from scratch.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/reset-stripe.ts <email>
 *
 * Example:
 *   npx tsx --env-file=.env.local scripts/reset-stripe.ts jan@enden.be
 */

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq } from "drizzle-orm"
import * as schema from "../src/lib/db/schema"

const email = process.argv[2]
if (!email) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/reset-stripe.ts <email>")
  process.exit(1)
}

async function reset() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set — run with --env-file=.env.local")

  const db = drizzle(neon(url), { schema })

  const creator = await db.query.user.findFirst({
    where: eq(schema.user.email, email),
  })

  if (!creator) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  await db
    .update(schema.user)
    .set({ stripeAccountId: null, chargesEnabled: false, updatedAt: new Date() })
    .where(eq(schema.user.id, creator.id))

  const result = await db
    .update(schema.drop)
    .set({ status: "pre_live", updatedAt: new Date() })
    .where(eq(schema.drop.userId, creator.id))

  console.log(`✓ cleared Stripe account for ${email}`)
  console.log(`✓ reset ${result.rowCount ?? "?"} drop(s) to pre_live`)
}

reset().catch((err) => {
  console.error(err)
  process.exit(1)
})
