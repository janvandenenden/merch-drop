import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { drop, order, orderItem } from "@/lib/db/schema"
import type { InferSelectModel } from "drizzle-orm"

export type Order = InferSelectModel<typeof order>
export type OrderItem = InferSelectModel<typeof orderItem>
export type Drop = InferSelectModel<typeof drop>

export type OrderWithItems = Order & {
  items: OrderItem[]
  drop: Pick<Drop, "id" | "title" | "slug" | "userId">
}

export type OrderSummary = Order & {
  items: OrderItem[]
  dropTitle: string
  dropId: string
}

export type OrdersPage = {
  orders: OrderSummary[]
  totalCount: number
  totalRevenueCents: number
}

export type DropStats = {
  dropId: string
  orderCount: number
  revenueCents: number
}

const PAGE_SIZE = 20

export async function listOrdersForCreator(
  userId: string,
  opts: { dropId?: string; page?: number } = {}
): Promise<OrdersPage> {
  const page = Math.max(1, opts.page ?? 1)
  const offset = (page - 1) * PAGE_SIZE

  // Find drops owned by this creator
  const ownedDrops = await db.query.drop.findMany({
    where: eq(drop.userId, userId),
    columns: { id: true, title: true },
  })

  const dropMap = new Map(ownedDrops.map((d) => [d.id, d.title]))
  let dropIds = ownedDrops.map((d) => d.id)

  if (opts.dropId) {
    if (!dropMap.has(opts.dropId)) return { orders: [], totalCount: 0, totalRevenueCents: 0 }
    dropIds = [opts.dropId]
  }

  if (dropIds.length === 0) return { orders: [], totalCount: 0, totalRevenueCents: 0 }

  // revenue = markupCents (per unit) × quantity, summed across all items
  const [{ count, revenue }] = await db
    .select({
      count: sql<number>`cast(count(distinct ${order.id}) as int)`,
      revenue: sql<number>`cast(coalesce(sum(${order.markupCents} * ${orderItem.quantity}), 0) as int)`,
    })
    .from(order)
    .leftJoin(orderItem, eq(orderItem.orderId, order.id))
    .where(inArray(order.dropId, dropIds))

  const orders = await db.query.order.findMany({
    where: inArray(order.dropId, dropIds),
    orderBy: desc(order.createdAt),
    limit: PAGE_SIZE,
    offset,
  })

  const orderIds = orders.map((o) => o.id)
  const items =
    orderIds.length > 0
      ? await db.query.orderItem.findMany({ where: inArray(orderItem.orderId, orderIds) })
      : []

  const itemsByOrder = new Map<string, OrderItem[]>()
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? []
    list.push(item)
    itemsByOrder.set(item.orderId, list)
  }

  const summaries: OrderSummary[] = orders.map((o) => ({
    ...o,
    items: itemsByOrder.get(o.id) ?? [],
    dropTitle: dropMap.get(o.dropId) ?? "",
    dropId: o.dropId,
  }))

  return { orders: summaries, totalCount: count, totalRevenueCents: revenue }
}

export async function getOrderForCreator(
  orderId: string,
  userId: string
): Promise<OrderWithItems | null> {
  const orderRecord = await db.query.order.findFirst({
    where: eq(order.id, orderId),
  })
  if (!orderRecord) return null

  const dropRecord = await db.query.drop.findFirst({
    where: and(eq(drop.id, orderRecord.dropId), eq(drop.userId, userId)),
    columns: { id: true, title: true, slug: true, userId: true },
  })
  if (!dropRecord) return null

  const items = await db.query.orderItem.findMany({
    where: eq(orderItem.orderId, orderId),
  })

  return { ...orderRecord, items, drop: dropRecord }
}

export async function getDropStatsForCreator(userId: string): Promise<DropStats[]> {
  const ownedDrops = await db.query.drop.findMany({
    where: eq(drop.userId, userId),
    columns: { id: true },
  })
  const dropIds = ownedDrops.map((d) => d.id)
  if (dropIds.length === 0) return []

  const rows = await db
    .select({
      dropId: order.dropId,
      orderCount: sql<number>`cast(count(distinct ${order.id}) as int)`,
      revenueCents: sql<number>`cast(coalesce(sum(${order.markupCents} * ${orderItem.quantity}), 0) as int)`,
    })
    .from(order)
    .leftJoin(orderItem, eq(orderItem.orderId, order.id))
    .where(inArray(order.dropId, dropIds))
    .groupBy(order.dropId)

  return rows.map((r) => ({
    dropId: r.dropId,
    orderCount: r.orderCount,
    revenueCents: r.revenueCents,
  }))
}
