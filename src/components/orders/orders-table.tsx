"use client"

import Link from "next/link"
import { StatusBadge } from "./status-badge"
import type { OrderSummary } from "@/lib/orders"

function formatItems(items: OrderSummary["items"]) {
  return items.map((i) => `${i.size} × ${i.quantity}`).join(", ") || "—"
}

export function OrdersTable({ orders, dropFilter }: { orders: OrderSummary[]; dropFilter?: string }) {
  function detailUrl(id: string) {
    return `/dashboard/orders/${id}${dropFilter ? `?drop=${dropFilter}` : ""}`
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Drop</th>
            <th className="px-4 py-3 font-medium">Buyer</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
            >
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                <Link href={detailUrl(order.id)} className="block">
                  {order.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium">
                <Link href={detailUrl(order.id)} className="block hover:underline">
                  {order.dropTitle}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <Link href={detailUrl(order.id)} className="block">
                  {order.buyerEmail}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <Link href={detailUrl(order.id)} className="block">
                  {formatItems(order.items)}
                </Link>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                <Link href={detailUrl(order.id)} className="block">
                  ${(order.totalCents / 100).toFixed(2)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link href={detailUrl(order.id)} className="block">
                  <StatusBadge status={order.status} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
