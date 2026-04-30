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

const SHIPPING_RATES_RESPONSE = {
  rates: [{ id: "STANDARD", name: "Standard", rate: "5.99", currency: "USD", minDeliveryDays: 3, maxDeliveryDays: 5 }],
  fulfillmentCents: 1350,
}

async function goToShippingStep() {
  vi.mocked(global.fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(SHIPPING_RATES_RESPONSE), { status: 200 }),
  )

  await userEvent.click(screen.getByRole("button", { name: "L" }))
  await userEvent.click(screen.getByRole("button", { name: /continue/i }))

  await userEvent.type(screen.getByLabelText("Full name"), "Jane Doe")
  await userEvent.type(screen.getByLabelText("Address"), "1 Main St")
  await userEvent.type(screen.getByLabelText("City"), "Portland")
  await userEvent.type(screen.getByLabelText("ZIP / Postal"), "97201")
  await userEvent.type(screen.getByLabelText("Country code"), "US")

  await userEvent.click(screen.getByRole("button", { name: /get shipping rates/i }))
  await screen.findByText(/standard/i)
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("BuyForm rendering", () => {
  it("renders all five size options", async () => {
    await renderForm()
    for (const size of ["S", "M", "L", "XL", "2XL"]) {
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument()
    }
  })

  it("renders continue button with price on size step", async () => {
    await renderForm("$28.50")
    expect(screen.getByRole("button", { name: /continue.*\$28\.50/i })).toBeInTheDocument()
  })

  it("continue button is disabled before size is selected", async () => {
    await renderForm()
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()
  })
})

// ─── Size selection ───────────────────────────────────────────────────────────

describe("size selection", () => {
  it("enables continue button after selecting a size", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled()
  })

  it("can switch between sizes", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    await userEvent.click(screen.getByRole("button", { name: "XL" }))
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled()
  })
})

// ─── Address step ─────────────────────────────────────────────────────────────

describe("address step", () => {
  it("advances to address step after selecting a size and clicking continue", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    await userEvent.click(screen.getByRole("button", { name: /continue/i }))
    expect(screen.getByLabelText("Full name")).toBeInTheDocument()
  })

  it("get shipping rates button is disabled until required fields are filled", async () => {
    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "M" }))
    await userEvent.click(screen.getByRole("button", { name: /continue/i }))
    expect(screen.getByRole("button", { name: /get shipping rates/i })).toBeDisabled()
  })
})

// ─── Shipping step ────────────────────────────────────────────────────────────

describe("shipping step", () => {
  it("shows shipping rates after address is submitted", async () => {
    await renderForm()
    await goToShippingStep()
    expect(screen.getByText(/standard/i)).toBeInTheDocument()
  })

  it("calls /api/shipping-rates with address and size", async () => {
    await renderForm()
    await goToShippingStep()

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/shipping-rates")
    const body = JSON.parse(init.body as string)
    expect(body.size).toBe("L")
    expect(body.address.name).toBe("Jane Doe")
  })

  it("shows error message when shipping rates fetch fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Check your address and try again." }), { status: 422 }),
    )

    await renderForm()
    await userEvent.click(screen.getByRole("button", { name: "L" }))
    await userEvent.click(screen.getByRole("button", { name: /continue/i }))
    await userEvent.type(screen.getByLabelText("Full name"), "Jane Doe")
    await userEvent.type(screen.getByLabelText("Address"), "1 Main St")
    await userEvent.type(screen.getByLabelText("City"), "Portland")
    await userEvent.type(screen.getByLabelText("ZIP / Postal"), "97201")
    await userEvent.type(screen.getByLabelText("Country code"), "US")
    await userEvent.click(screen.getByRole("button", { name: /get shipping rates/i }))

    await screen.findByText("Check your address and try again.")
  })
})

// ─── Checkout submission ──────────────────────────────────────────────────────

describe("checkout submission", () => {
  it("POSTs fulfillmentCents from shipping-rates response to /api/checkout", async () => {
    await renderForm()
    await goToShippingStep()

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session" }), { status: 200 }),
    )

    await userEvent.click(screen.getByRole("button", { name: /buy/i }))

    await waitFor(() => {
      const checkoutCall = vi.mocked(global.fetch).mock.calls[1] as [string, RequestInit]
      expect(checkoutCall[0]).toBe("/api/checkout")
      const body = JSON.parse(checkoutCall[1].body as string)
      expect(body.fulfillmentCents).toBe(1350)
      expect(body.size).toBe("L")
      expect(body.selectedRate.id).toBe("STANDARD")
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
