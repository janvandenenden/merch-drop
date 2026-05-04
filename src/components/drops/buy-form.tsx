"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SIZES = ["S", "M", "L", "XL", "2XL"] as const
type Size = (typeof SIZES)[number]

type Step = "details" | "shipping"

interface Address {
  name: string
  address1: string
  city: string
  stateCode: string
  zip: string
  countryCode: string
}

interface ShippingRate {
  id: string
  name: string
  rate: string
  currency: string
  minDeliveryDays?: number
  maxDeliveryDays?: number
}

interface OrderItem {
  size: Size
  quantity: number
}

interface BuyFormProps {
  dropId: string
  productPriceCents: number
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export function BuyForm({ dropId, productPriceCents }: BuyFormProps) {
  const [step, setStep] = useState<Step>("details")
  const [sizeQtys, setSizeQtys] = useState<Record<Size, number>>({
    S: 0, M: 0, L: 0, XL: 0, "2XL": 0,
  })
  const [address, setAddress] = useState<Address>({
    name: "",
    address1: "",
    city: "",
    stateCode: "",
    zip: "",
    countryCode: "",
  })
  const [rates, setRates] = useState<ShippingRate[]>([])
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [fulfillmentCents, setFulfillmentCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: value }))
  }

  function setQty(size: Size, delta: number) {
    setSizeQtys((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(10, prev[size] + delta)),
    }))
  }

  const selectedItems: OrderItem[] = SIZES.flatMap((size) =>
    sizeQtys[size] > 0 ? [{ size, quantity: sizeQtys[size] }] : [],
  )
  const totalQuantity = selectedItems.reduce((sum, i) => sum + i.quantity, 0)

  const hasAddress = Boolean(
    address.name.trim() &&
      address.address1.trim() &&
      address.city.trim() &&
      address.zip.trim() &&
      address.countryCode.length === 2,
  )
  const canContinue = totalQuantity > 0 && hasAddress

  async function fetchRates() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, items: selectedItems, address }),
    })
    setLoading(false)
    if (res.ok) {
      const { rates: fetched, fulfillmentCents: cost } = (await res.json()) as {
        rates: ShippingRate[]
        fulfillmentCents: number
      }
      setRates(fetched)
      setFulfillmentCents(cost)
      setSelectedRateId(fetched[0]?.id ?? null)
      setStep("shipping")
    } else {
      const { error: msg } = await res.json().catch(() => ({ error: undefined }))
      setError((msg as string | undefined) ?? "Failed to fetch shipping rates.")
    }
  }

  async function handleBuy() {
    if (!selectedRateId) return
    const selectedRate = rates.find((r) => r.id === selectedRateId)
    if (!selectedRate) return
    setLoading(true)
    setError(null)
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, items: selectedItems, address, selectedRate, fulfillmentCents }),
    })
    if (res.ok) {
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } else {
      setLoading(false)
      setError("Checkout failed. Please try again.")
    }
  }

  if (step === "details") {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void fetchRates()
        }}
      >
        <div className="rounded-md bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">Product</p>
          <p className="text-lg font-semibold">{formatCents(productPriceCents)} each + shipping</p>
        </div>

        <div className="rounded-md border border-border px-4 py-3">
          <p className="mb-3 text-sm font-medium">Size &amp; quantity</p>
          <div className="flex flex-col gap-2">
            {SIZES.map((size) => (
              <div key={size} className="flex items-center justify-between gap-3">
                <span className="w-10 text-sm font-medium">{size}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease ${size} quantity`}
                    onClick={() => setQty(size, -1)}
                    disabled={sizeQtys[size] === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-muted disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium" aria-label={`${size} quantity`}>{sizeQtys[size]}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${size} quantity`}
                    onClick={() => setQty(size, 1)}
                    disabled={sizeQtys[size] >= 10}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm hover:bg-muted disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalQuantity > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {totalQuantity} shirt{totalQuantity !== 1 ? "s" : ""} · {formatCents(productPriceCents * totalQuantity)} + shipping
            </p>
          )}
        </div>

        <div className="rounded-md border border-border">
          <div className="px-4 py-3">
            <p className="text-sm font-medium">Shipping address</p>
            {hasAddress && (
              <p className="text-sm text-muted-foreground">
                {address.city}, {address.countryCode}
              </p>
            )}
          </div>
          <div className="grid gap-3 border-t border-border px-4 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={address.name} onChange={(e) => patch("name", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address1">Address</Label>
              <Input
                id="address1"
                value={address.address1}
                onChange={(e) => patch("address1", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={address.city} onChange={(e) => patch("city", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="zip">ZIP / Postal</Label>
                <Input id="zip" value={address.zip} onChange={(e) => patch("zip", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="stateCode">State / Province</Label>
                <Input
                  id="stateCode"
                  placeholder="Optional"
                  value={address.stateCode}
                  onChange={(e) => patch("stateCode", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="countryCode">Country code</Label>
                <Input
                  id="countryCode"
                  placeholder="US, GB, DE…"
                  maxLength={2}
                  value={address.countryCode}
                  onChange={(e) => patch("countryCode", e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={!canContinue || loading} className="w-full">
          {loading ? "Fetching rates…" : "Calculate shipping"}
        </Button>
      </form>
    )
  }

  // step === "shipping"
  const selectedRate = rates.find((r) => r.id === selectedRateId)

  function formatRate(rate: ShippingRate) {
    const rawCents = Math.round(parseFloat(rate.rate) * 100)
    const price = rawCents === 0 ? "Free" : formatCents(rawCents)
    const days =
      rate.minDeliveryDays != null
        ? ` · ${rate.minDeliveryDays}–${rate.maxDeliveryDays ?? rate.minDeliveryDays} days`
        : ""
    return { price, days }
  }

  const priceBreakdown = (() => {
    if (!selectedRate) return null
    const shippingCents = Math.round(parseFloat(selectedRate.rate) * 100)
    const productTotal = productPriceCents * totalQuantity
    return { shippingCents, productTotal, grandTotal: productTotal + shippingCents }
  })()

  const buyTotalDisplay = priceBreakdown
    ? formatCents(priceBreakdown.grandTotal)
    : formatCents(productPriceCents * totalQuantity)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Shipping method</p>
      <div className="flex flex-col gap-2">
        {rates.map((rate) => {
          const { price, days } = formatRate(rate)
          return (
            <button
              key={rate.id}
              onClick={() => setSelectedRateId(rate.id)}
              className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm transition-colors ${
                selectedRateId === rate.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="font-medium">
                {rate.name}
                {days}
              </span>
              <span>{price}</span>
            </button>
          )
        })}
      </div>
      {priceBreakdown && (
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
          {selectedItems.map((item) => (
            <div key={item.size} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{item.size} × {item.quantity}</span>
              <span className="font-medium">{formatCents(productPriceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">{formatCents(priceBreakdown.shippingCents)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="font-medium">Total</span>
            <span className="text-base font-semibold">{formatCents(priceBreakdown.grandTotal)}</span>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setStep("details")
            setError(null)
          }}
          className="flex-1"
        >
          Back
        </Button>
        <Button disabled={!selectedRateId || loading} onClick={handleBuy} className="flex-1">
          {loading ? "Redirecting…" : `Buy — ${buyTotalDisplay}`}
        </Button>
      </div>
    </div>
  )
}
