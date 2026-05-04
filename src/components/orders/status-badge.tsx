import type { Order } from "@/lib/orders"

const LABELS: Record<Order["status"], string> = {
  pending: "Pending",
  paid: "Paid",
  submitted: "Submitted",
  shipped: "Shipped",
  cancelled: "Cancelled",
}

const CLASSES: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  shipped: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-muted text-muted-foreground",
}

export function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CLASSES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}
