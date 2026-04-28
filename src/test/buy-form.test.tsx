import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

afterEach(cleanup)

async function renderForm(priceDisplay = "$28.50") {
  const { BuyForm } = await import("@/components/drops/buy-form")
  render(<BuyForm dropId="drop-1" priceDisplay={priceDisplay} />)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("BuyForm rendering", () => {
  it("renders all five size options", async () => {
    await renderForm()
    for (const size of ["S", "M", "L", "XL", "2XL"]) {
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument()
    }
  })

  it("renders buy button with price", async () => {
    await renderForm("$28.50")
    expect(screen.getByRole("button", { name: /buy.*\$28\.50/i })).toBeInTheDocument()
  })

  it("buy button is disabled before size is selected", async () => {
    await renderForm()
    expect(screen.getByRole("button", { name: /buy/i })).toBeDisabled()
  })
})

// ─── Size selection ───────────────────────────────────────────────────────────

describe("size selection", () => {
  it("enables buy button after selecting a size", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    expect(screen.getByRole("button", { name: /buy/i })).not.toBeDisabled()
  })

  it("can switch between sizes", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    await userEvent.click(screen.getByRole("button", { name: "XL" }))
    expect(screen.getByRole("button", { name: /buy/i })).not.toBeDisabled()
  })
})

// ─── Checkout submission ──────────────────────────────────────────────────────

describe("checkout submission", () => {
  it("POSTs dropId and selected size to /api/checkout", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session" }), { status: 200 })
    )

    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "L" }))
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/checkout",
        expect.objectContaining({ method: "POST" })
      )
    })

    const body = JSON.parse(
      (vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body).toEqual({ dropId: "drop-1", size: "L" })
  })

  it("shows Redirecting… while awaiting response", async () => {
    let resolve!: (v: Response) => void
    vi.mocked(global.fetch).mockReturnValue(new Promise((r) => (resolve = r)))

    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "S" }))
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    expect(await screen.findByRole("button", { name: /redirecting/i })).toBeInTheDocument()

    resolve(new Response(JSON.stringify({ url: "https://checkout.stripe.com/s" }), { status: 200 }))
  })

  it("re-enables buy button if checkout request fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "failed" }), { status: 500 })
    )

    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /buy/i })).not.toBeDisabled()
    })
  })
})
