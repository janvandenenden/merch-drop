import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { listDrops } from "@/lib/drops"
import { APP_CONTENT_CLASS, APP_PAGE_CLASS } from "@/lib/layout"
import { listOrdersForCreator } from "@/lib/orders"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { OrdersTable } from "@/components/orders/orders-table"
import { DropFilterSelect } from "@/components/orders/drop-filter-select"
import { PaginationNav } from "@/components/orders/pagination-nav"

const PAGE_SIZE = 20

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string; page?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user } = session
  const params = await searchParams
  const dropFilter = params.drop
  const page = Math.max(1, Number(params.page ?? 1) || 1)

  const [drops, { orders, totalCount, totalRevenueCents }] = await Promise.all([
    listDrops(user.id),
    listOrdersForCreator(user.id, { dropId: dropFilter, page }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function buildUrl(overrides: { drop?: string | null; page?: number }) {
    const p = new URLSearchParams()
    const nextDrop = "drop" in overrides ? overrides.drop : dropFilter
    const nextPage = overrides.page ?? 1
    if (nextDrop) p.set("drop", nextDrop)
    if (nextPage > 1) p.set("page", String(nextPage))
    const qs = p.toString()
    return `/dashboard/orders${qs ? `?${qs}` : ""}`
  }

  return (
    <main className={APP_PAGE_CLASS}>
      <div className={`${APP_CONTENT_CLASS} space-y-6`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:underline">Drops</Link>
              <span>/</span>
              <span>Orders</span>
            </div>
            <h1 className="text-2xl font-semibold">Orders</h1>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <DropFilterSelect
            drops={drops.map((d) => ({ id: d.id, title: d.title }))}
            selected={dropFilter}
          />

          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Orders: </span>
              <span className="font-medium">{totalCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-medium">${(totalRevenueCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {dropFilter ? "No orders for this drop yet." : "No orders yet."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <OrdersTable orders={orders} dropFilter={dropFilter} />
            </CardContent>
          </Card>
        )}

        {totalPages > 1 && (
          <PaginationNav
            page={page}
            totalPages={totalPages}
            buildUrl={(p) => buildUrl({ page: p })}
          />
        )}
      </div>
    </main>
  )
}
