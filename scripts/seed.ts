/**
 * Seed script for browser testing the public drop page.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed.ts
 *
 * Creates one creator and three drops (one per status).
 * Safe to re-run — upserts on conflict.
 *
 * Public URLs after seeding:
 *   ready    → http://localhost:3001/seed-creator/coming-soon-drop
 *   live     → http://localhost:3001/seed-creator/live-drop
 *   closed   → http://localhost:3001/seed-creator/closed-drop
 */

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { eq } from "drizzle-orm"
import * as schema from "../src/lib/db/schema"

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3001"
const CREATOR_SLUG = "seed-creator"
const CREATOR_ID = "seed-user-00000000-0000-0000-0000-000000000001"

const DROPS = [
  {
    slug: "coming-soon-drop",
    title: "Coming Soon Drop",
    status: "ready" as const,
    mockupUrl: null,
  },
  {
    slug: "live-drop",
    title: "Live Drop",
    status: "live" as const,
    mockupUrl:
      "https://files.cdn.printful.com/mockup-generator/cached/10/product_10_9-1614681077.jpg",
  },
  {
    slug: "closed-drop",
    title: "Closed Drop",
    status: "closed" as const,
    mockupUrl: null,
  },
]

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set — run with --env-file=.env.local")

  const db = drizzle(neon(url), { schema })

  // Upsert creator
  await db
    .insert(schema.user)
    .values({
      id: CREATOR_ID,
      name: "Seed Creator",
      email: "seed@merch-drop.test",
      emailVerified: true,
      slug: CREATOR_SLUG,
      chargesEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.user.id,
      set: { slug: CREATOR_SLUG, chargesEnabled: true, updatedAt: new Date() },
    })

  console.log(`✓ creator  /${CREATOR_SLUG}`)

  // Upsert drops
  for (const drop of DROPS) {
    const existing = await db.query.drop.findFirst({
      where: eq(schema.drop.slug, drop.slug),
    })

    if (existing) {
      await db
        .update(schema.drop)
        .set({ status: drop.status, mockupUrl: drop.mockupUrl, updatedAt: new Date() })
        .where(eq(schema.drop.id, existing.id))
    } else {
      await db.insert(schema.drop).values({
        userId: CREATOR_ID,
        slug: drop.slug,
        title: drop.title,
        description: null,
        supportEmail: "support@merch-drop.test",
        markupCents: 500,
        shirtColor: "white",
        status: drop.status,
        mockupUrl: drop.mockupUrl,
      })
    }

    console.log(`✓ ${drop.status.padEnd(8)}  ${BASE_URL}/${CREATOR_SLUG}/${drop.slug}`)
  }

  console.log("\nDone. Open the URLs above in your browser.")
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
