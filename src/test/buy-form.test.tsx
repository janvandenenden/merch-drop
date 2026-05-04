import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

afterEach(cleanup)

async function renderForm(productPriceCents = 3405) {
  const { BuyForm } = await import("@/components/drops/buy-form")
  render(<BuyForm dropId="drop-1" productPriceCents={productPriceCents} />)
}

const SHIPPING_RATES_RESPONSE = {
  rates: [
    {
      id: "STANDARD",
      name: "Standard",
      rate: "5.99",
      currency: "USD",
      minDeliveryDays: 3,
      maxDeliveryDays: 5,
    },
  ],
  fulfillmentCents: 1350,
}

async function fillAddress() {
  await userEvent.type(screen.getByLabelText("Full name"), "Jane Doe")
  await userEvent.type(screen.getByLabelText("Address"), "1 Main St")
  await userEvent.type(screen.getByLabelText("City"), "Portland")
  await userEvent.type(screen.getByLabelText("ZIP / Postal"), "97201")
  await userEvent.type(screen.getByLabelText("Country code"), "US")
}

async function goToShippingStep(size = "L") {
  vi.mocked(global.fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(SHIPPING_RATES_RESPONSE), { status: 200 }),
  )

  await userEvent.click(screen.getByRole("button", { name: `Increase ${size} quantity` }))
  await fillAddress()
  await userEvent.click(screen.getByRole("button", { name: /calculate shipping/i }))
  await screen.findByText(/standard/i)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("BuyForm rendering", () => {
  it("renders all five sizes in the grid", async () => {
    await renderForm()
    for (const size of ["S", "M", "L", "XL", "2XL"]) {
      expect(screen.getByText(size)).toBeInTheDocument()
    }
  })

  it("shows the fixed product price on the details step", async () => {
    await renderForm(2850)
    expect(screen.getByText("$28.50 each + shipping")).toBeInTheDocument()
  })

  it("all sizes start at quantity 0", async () => {
    await renderForm()
    for (const size of ["S", "M", "L", "XL", "2XL"]) {
      expect(screen.getByLabelText(`${size} quantity`)).toHaveTextContent("0")
    }
  })

  it("calculate shipping button is disabled before any qty is selected", async () => {
    await renderForm()
    expect(screen.getByRole("button", { name: /calculate shipping/i })).toBeDisabled()
  })

  it("decrease button is disabled at quantity 0", async () => {
    await renderForm()
    expect(screen.getByRole("button", { name: "Decrease L quantity" })).toBeDisabled()
  })
})

// ─── Size grid quantity controls ──────────────────────────────────────────────

describe("size grid", () => {
  it("increments a size quantity", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    expect(screen.getByLabelText("M quantity")).toHaveTextContent("1")
  })

  it("decrements a size quantity", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Decrease M quantity" }))
    expect(screen.getByLabelText("M quantity")).toHaveTextContent("1")
  })

  it("caps quantity at 10", async () => {
    await renderForm()
    for (let i = 0; i < 11; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Increase S quantity" }))
    }
    expect(screen.getByLabelText("S quantity")).toHaveTextContent("10")
    expect(screen.getByRole("button", { name: "Increase S quantity" })).toBeDisabled()
  })

  it("multiple sizes can have quantities simultaneously", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    expect(screen.getByLabelText("M quantity")).toHaveTextContent("1")
    expect(screen.getByLabelText("L quantity")).toHaveTextContent("2")
  })

  it("shows total shirt count and subtotal when qty > 0", async () => {
    await renderForm(3405)
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    expect(screen.getByText(/2 shirts/)).toBeInTheDocument()
    expect(screen.getByText(/\$68\.10/)).toBeInTheDocument()
  })
})

// ─── Details step ─────────────────────────────────────────────────────────────

describe("details step", () => {
  it("calculate shipping stays disabled with qty but no address", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    expect(screen.getByRole("button", { name: /calculate shipping/i })).toBeDisabled()
  })

  it("calculate shipping stays disabled with address but no qty", async () => {
    await renderForm()
    await fillAddress()
    expect(screen.getByRole("button", { name: /calculate shipping/i })).toBeDisabled()
  })

  it("calculate shipping enabled when qty > 0 and address filled", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await fillAddress()
    expect(screen.getByRole("button", { name: /calculate shipping/i })).not.toBeDisabled()
  })
})

// ─── Shipping step ────────────────────────────────────────────────────────────

describe("shipping step", () => {
  it("shows shipping rates after form is submitted", async () => {
    await renderForm()
    await goToShippingStep()
    expect(screen.getByText(/standard/i)).toBeInTheDocument()
    expect(screen.getAllByText("$5.99")).toHaveLength(2)
  })

  it("shows per-size breakdown rows on shipping step", async () => {
    await renderForm(3405)
    await goToShippingStep("L")
    expect(screen.getByText("L × 1")).toBeInTheDocument()
    expect(screen.getByText("$34.05")).toBeInTheDocument()
  })

  it("shows multi-size breakdown when multiple sizes selected", async () => {
    await renderForm(3405)
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(SHIPPING_RATES_RESPONSE), { status: 200 }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await fillAddress()
    await userEvent.click(screen.getByRole("button", { name: /calculate shipping/i }))
    await screen.findByText(/standard/i)

    expect(screen.getByText("M × 1")).toBeInTheDocument()
    expect(screen.getByText("L × 2")).toBeInTheDocument()
    // total: (1 + 2) × $34.05 + $5.99 = $108.14
    expect(screen.getByRole("button", { name: /buy.*\$108\.14/i })).toBeInTheDocument()
  })

  it("shows error message when shipping rates fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Check your address and try again." }), { status: 422 }),
    )
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await fillAddress()
    await userEvent.click(screen.getByRole("button", { name: /calculate shipping/i }))
    await screen.findByText("Check your address and try again.")
  })
})

// ─── Checkout submission ──────────────────────────────────────────────────────

describe("checkout submission", () => {
  it("POSTs items array to /api/shipping-rates", async () => {
    await renderForm()
    await goToShippingStep("L")

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/shipping-rates")
    const body = JSON.parse(init.body as string)
    expect(body.items).toEqual([{ size: "L", quantity: 1 }])
    expect(body.address.name).toBe("Jane Doe")
  })

  it("POSTs items array to /api/checkout", async () => {
    await renderForm()
    await goToShippingStep("L")

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session" }), { status: 200 }),
    )
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      const checkoutCall = vi.mocked(global.fetch).mock.calls[1] as [string, RequestInit]
      expect(checkoutCall[0]).toBe("/api/checkout")
      const body = JSON.parse(checkoutCall[1].body as string)
      expect(body.items).toEqual([{ size: "L", quantity: 1 }])
      expect(body.fulfillmentCents).toBe(1350)
      expect(body.selectedRate.id).toBe("STANDARD")
    })
  })

  it("POSTs all selected sizes in items array", async () => {
    await renderForm()
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(SHIPPING_RATES_RESPONSE), { status: 200 }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Increase M quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await userEvent.click(screen.getByRole("button", { name: "Increase L quantity" }))
    await fillAddress()
    await userEvent.click(screen.getByRole("button", { name: /calculate shipping/i }))
    await screen.findByText(/standard/i)

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session" }), { status: 200 }),
    )
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      const checkoutCall = vi.mocked(global.fetch).mock.calls[1] as [string, RequestInit]
      const body = JSON.parse((checkoutCall[1] as RequestInit).body as string)
      expect(body.items).toEqual([
        { size: "M", quantity: 1 },
        { size: "L", quantity: 2 },
      ])
    })
  })

  it("shows Redirecting… while awaiting checkout response", async () => {
    await renderForm()
    await goToShippingStep()

    let resolve!: (v: Response) => void
    vi.mocked(global.fetch).mockReturnValueOnce(new Promise((r) => (resolve = r)))
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))
    expect(await screen.findByRole("button", { name: /redirecting/i })).toBeInTheDocument()

    resolve(new Response(JSON.stringify({ url: "https://checkout.stripe.com/s" }), { status: 200 }))
  })

  it("shows error and re-enables buy button if checkout fails", async () => {
    await renderForm()
    await goToShippingStep()

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "failed" }), { status: 500 }),
    )
    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /buy/i })).not.toBeDisabled()
    })
  })
})
