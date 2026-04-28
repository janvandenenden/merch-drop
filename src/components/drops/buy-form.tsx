"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

const SIZES = ["S", "M", "L", "XL", "2XL"] as const
type Size = (typeof SIZES)[number]

interface BuyFormProps {
  dropId: string
  priceDisplay: string
}

export function BuyForm({ dropId, priceDisplay }: BuyFormProps) {
  const [size, setSize] = useState<Size | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleBuy() {
    if (!size) return
    setLoading(true)
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, size }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      setLoading(false)
    }
  }

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

      <Button
        size="lg"
        disabled={!size || loading}
        onClick={handleBuy}
        className="w-full"
      >
        {loading ? "Redirecting…" : `Buy — ${priceDisplay}`}
      </Button>
    </div>
  )
}
