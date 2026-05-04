import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getOrderForCreator } from "@/lib/orders"
import { StatusBadge } from "@/components/orders/status-badge"

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://merch-drop.com"

type ShippingAddress = {
  name: string
  address1: string
  city: string
  stateCode?: string
  zip: string
  countryCode: string
}

function formatAddress(addr: ShippingAddress) {
  const parts = [
    addr.name,
    addr.address1,
    [addr.city, addr.stateCode, addr.zip].filter(Boolean).join(", "),
    addr.countryCode,
  ]
  return parts.filter(Boolean)
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ drop?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { id } = await params
  const sp = await searchParams
  const order = await getOrderForCreator(id, session.user.id)
  if (!order) notFound()

  const address = order.shippingAddress as ShippingAddress
  const addressLines = formatAddress(address)

  const totalQuantity = order.items.reduce((s, i) => s + i.quantity, 0)
  const serviceFee = order.totalCents - order.markupCents * totalQuantity - order.fulfillmentCents * totalQuantity - order.shippingCents

  const backUrl = sp.drop
    ? `/dashboard/orders?drop=${sp.drop}`
    : `/dashboard/orders`

  const dropPublicUrl = `${BASE_URL}/${session.user.slug}/${order.drop.slug}`

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">Drops</Link>
            <span>/</span>
            <Link href={backUrl} className="hover:underline">Orders</Link>
            <span>/</span>
            <span className="font-mono text-xs">{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Order detail</h1>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <Section title="Drop">
          <Row
            label="Title"
            value={
              <Link href={dropPublicUrl} target="_blank" className="hover:underline">
                {order.drop.title}
              </Link>
            }
          />
          {order.printfulOrderId && (
            <Row label="Printful order ID" value={<span className="font-mono text-xs">{order.printfulOrderId}</span>} />
          )}
        </Section>

        <Section title="Buyer">
          <Row label="Email" value={order.buyerEmail} />
          <Row
            label="Shipping address"
            value={
              <span className="text-right leading-relaxed">
                {addressLines.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </span>
            }
          />
        </Section>

        <Section title="Items">
          {order.items.map((item) => (
            <Row
              key={item.id}
              label={`Size ${item.size} × ${item.quantity}`}
              value={`$${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}`}
            />
          ))}
        </Section>

        <Section title="Price breakdown">
          <Row label="Creator markup" value={`$${((order.markupCents * totalQuantity) / 100).toFixed(2)}`} />
          <Row label="Fulfillment" value={`$${((order.fulfillmentCents * totalQuantity) / 100).toFixed(2)}`} />
          <Row label="Shipping" value={`$${(order.shippingCents / 100).toFixed(2)}`} />
          <Row label="Service fee" value={`$${(serviceFee / 100).toFixed(2)}`} />
          <Row label="Total" value={<span className="text-base">${(order.totalCents / 100).toFixed(2)}</span>} />
        </Section>

        <Section title="Timeline">
          <Row label="Placed" value={formatDate(order.createdAt)} />
          {order.status === "shipped" && order.trackingNumber && (
            <Row label="Tracking number" value={<span className="font-mono text-xs">{order.trackingNumber}</span>} />
          )}
          {order.status === "cancelled" && order.cancellationReason && (
            <Row label="Cancellation reason" value={order.cancellationReason} />
          )}
          {order.cancelledAt && (
            <Row label="Cancelled" value={formatDate(order.cancelledAt)} />
          )}
        </Section>
      </div>
    </main>
  )
}
