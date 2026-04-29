"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SIZES = ["S", "M", "L", "XL", "2XL"] as const
type Size = (typeof SIZES)[number]

type Step = "size" | "address" | "shipping"

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

interface BuyFormProps {
  dropId: string
  priceDisplay: string
}

export function BuyForm({ dropId, priceDisplay }: BuyFormProps) {
  const [step, setStep] = useState<Step>("size")
  const [size, setSize] = useState<Size | null>(null)
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function patch(field: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [field]: value }))
  }

  async function fetchRates() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/shipping-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, size, address }),
    })
    setLoading(false)
    if (res.ok) {
      const { rates: fetched } = (await res.json()) as { rates: ShippingRate[] }
      setRates(fetched)
      setSelectedRateId(fetched[0]?.id ?? null)
      setStep("shipping")
    } else {
      const { error: msg } = await res.json().catch(() => ({ error: undefined }))
      setError((msg as string | undefined) ?? "Failed to fetch shipping rates.")
    }
  }

  async function handleBuy() {
    if (!size || !selectedRateId) return
    const selectedRate = rates.find((r) => r.id === selectedRateId)
    if (!selectedRate) return
    setLoading(true)
    setError(null)
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, size, address, selectedRate }),
    })
    if (res.ok) {
      const { url } = (await res.json()) as { url: string }
      window.location.href = url
    } else {
      setLoading(false)
      setError("Checkout failed. Please try again.")
    }
  }

  if (step === "size") {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium">Size</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-12 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  size === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button size="lg" disabled={!size} onClick={() => setStep("address")} className="w-full">
          {`Continue — ${priceDisplay}`}
        </Button>
      </div>
    )
  }

  if (step === "address") {
    const canContinue =
      address.name.trim() &&
      address.address1.trim() &&
      address.city.trim() &&
      address.zip.trim() &&
      address.countryCode.length === 2

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Shipping address</p>
        <div className="grid gap-3">
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setStep("size")
              setError(null)
            }}
            className="flex-1"
          >
            Back
          </Button>
          <Button disabled={!canContinue || loading} onClick={fetchRates} className="flex-1">
            {loading ? "Fetching rates…" : "Get shipping rates"}
          </Button>
        </div>
      </div>
    )
  }

  // step === "shipping"
  const selectedRate = rates.find((r) => r.id === selectedRateId)

  function formatRate(rate: ShippingRate) {
    const cents = Math.round(parseFloat(rate.rate) * 100)
    const price = cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`
    const days =
      rate.minDeliveryDays != null
        ? ` · ${rate.minDeliveryDays}–${rate.maxDeliveryDays ?? rate.minDeliveryDays} days`
        : ""
    return { price, days }
  }

  const shippingDisplay = selectedRate
    ? ` + $${(Math.round(parseFloat(selectedRate.rate) * 100) / 100).toFixed(2)} shipping`
    : ""

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
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setStep("address")
            setError(null)
          }}
          className="flex-1"
        >
          Back
        </Button>
        <Button disabled={!selectedRateId || loading} onClick={handleBuy} className="flex-1">
          {loading ? "Redirecting…" : `Buy — ${priceDisplay}${shippingDisplay}`}
        </Button>
      </div>
    </div>
  )
}
