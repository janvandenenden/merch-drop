import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop, user } from "@/lib/db/schema"
import { generateSlug, ensureUniqueSlug } from "@/lib/slugs"
import type { InferSelectModel } from "drizzle-orm"

export type Creator = InferSelectModel<typeof user>

export type Drop = InferSelectModel<typeof drop>

export type CreateDropParams = {
  userId: string
  title: string
  slug?: string
  description?: string
  supportEmail: string
  markupCents: number
  shirtColor?: string
  status?: "pre_live" | "live"
  designFileKey?: string
  printFileKey?: string
  mockupKey?: string
  placement?: { x: number; y: number; scale: number; rotate: number }
}

export type UpdateDropParams = {
  title?: string
  slug?: string
  description?: string
  supportEmail?: string
  markupCents?: number
  shirtColor?: string
  designFileKey?: string
  printFileKey?: string
  mockupUrl?: string
  mockupKey?: string
  placement?: { x: number; y: number; scale: number; rotate: number }
  status?: "pre_live" | "live" | "paused" | "closed"
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pre_live: ["live"],
  live: ["paused", "closed"],
  paused: ["live", "closed"],
  closed: [],
}

const LOCKED_AFTER_FIRST_SALE: (keyof UpdateDropParams)[] = [
  "markupCents",
  "shirtColor",
  "designFileKey",
  "printFileKey",
  "placement",
]

function slugFinder(userId: string) {
  return {
    findFirst: ({ where }: { where: { userId: string; slug: string } }) =>
      db.query.drop.findFirst({
        where: and(eq(drop.userId, where.userId), eq(drop.slug, where.slug)),
      }),
  }
}

export async function createDrop(params: CreateDropParams): Promise<Drop> {
  const base = params.slug ?? generateSlug(params.title)
  const slug = await ensureUniqueSlug(params.userId, base, slugFinder(params.userId))

  const [created] = await db
    .insert(drop)
    .values({
      userId: params.userId,
      title: params.title,
      slug,
      description: params.description,
      supportEmail: params.supportEmail,
      markupCents: params.markupCents,
      shirtColor: params.shirtColor ?? "white",
      status: params.status ?? "pre_live",
      designFileKey: params.designFileKey,
      printFileKey: params.printFileKey,
      mockupKey: params.mockupKey,
      placement: params.placement,
    })
    .returning()

  return created
}

export async function getDrop(dropId: string): Promise<Drop | null> {
  return (await db.query.drop.findFirst({ where: eq(drop.id, dropId) })) ?? null
}

export async function listDrops(userId: string): Promise<Drop[]> {
  return db.query.drop.findMany({ where: eq(drop.userId, userId) })
}

export async function updateDrop(dropId: string, params: UpdateDropParams): Promise<Drop> {
  const record = await getDrop(dropId)
  if (!record) throw new Error(`Drop not found: ${dropId}`)

  if (params.status !== undefined && params.status !== record.status) {
    const allowed = VALID_TRANSITIONS[record.status] ?? []
    if (!allowed.includes(params.status)) {
      throw new Error(`Invalid status transition: ${record.status} → ${params.status}`)
    }
  }

  if (record.firstSaleAt) {
    for (const field of LOCKED_AFTER_FIRST_SALE) {
      if (params[field] !== undefined) {
        throw new Error(`Cannot change ${field} after first sale`)
      }
    }
  }

  let slug = params.slug
  if (slug !== undefined && slug !== record.slug) {
    slug = await ensureUniqueSlug(record.userId, slug, slugFinder(record.userId))
  }

  const [updated] = await db
    .update(drop)
    .set({ ...params, ...(slug !== undefined ? { slug } : {}), updatedAt: new Date() })
    .where(eq(drop.id, dropId))
    .returning()

  return updated
}

export async function deleteDrop(dropId: string, userId: string): Promise<void> {
  await db.delete(drop).where(and(eq(drop.id, dropId), eq(drop.userId, userId)))
}

export async function getDropBySlug(
  creatorSlug: string,
  dropSlug: string
): Promise<{ drop: Drop; creator: Creator } | null> {
  const creator = await db.query.user.findFirst({ where: eq(user.slug, creatorSlug) })
  if (!creator) return null

  const record = await db.query.drop.findFirst({
    where: and(eq(drop.userId, creator.id), eq(drop.slug, dropSlug)),
  })
  if (!record) return null

  return { drop: record, creator }
}
