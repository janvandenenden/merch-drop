import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderForm(creatorSlug = "jan") {
  const { NewDropForm } = await import("@/components/drops/new-drop-form")
  render(<NewDropForm creatorSlug={creatorSlug} />)
}

function fillRequiredFields() {
  return {
    title: screen.getByLabelText("Title"),
    supportEmail: screen.getByLabelText("Support email"),
    submitBtn: screen.getByRole("button", { name: /create drop/i }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

afterEach(cleanup)

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("NewDropForm rendering", () => {
  it("renders all fields", async () => {
    await renderForm()
    expect(screen.getByLabelText("Title")).toBeInTheDocument()
    expect(screen.getByLabelText("URL slug")).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Support email")).toBeInTheDocument()
    expect(screen.getByLabelText("Your markup")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create drop/i })).toBeInTheDocument()
  })

  it("shows creator slug in URL preview", async () => {
    await renderForm("mystore")
    expect(screen.getByText(/merch-drop\.com\/mystore\//)).toBeInTheDocument()
  })

  it("shows price breakdown card", async () => {
    await renderForm()
    expect(screen.getByText("Price breakdown")).toBeInTheDocument()
    expect(screen.getByText("Buyer pays")).toBeInTheDocument()
    expect(screen.getByText("You earn")).toBeInTheDocument()
  })
})

// ─── Slug auto-generation ─────────────────────────────────────────────────────

describe("slug auto-generation", () => {
  it("auto-populates slug from title", async () => {
    await renderForm()
    await userEvent.type(screen.getByLabelText("Title"), "Summer Drop 2026")
    await waitFor(() => {
      expect(screen.getByLabelText("URL slug")).toHaveValue("summer-drop-2026")
    })
  })

  it("strips special characters from slug", async () => {
    await renderForm()
    await userEvent.type(screen.getByLabelText("Title"), "Hello & World!")
    await waitFor(() => {
      expect(screen.getByLabelText("URL slug")).toHaveValue("hello-world")
    })
  })

  it("stops auto-updating after manual slug edit", async () => {
    await renderForm()
    await userEvent.type(screen.getByLabelText("Title"), "My Drop")
    await userEvent.clear(screen.getByLabelText("URL slug"))
    await userEvent.type(screen.getByLabelText("URL slug"), "custom-slug")
    await userEvent.type(screen.getByLabelText("Title"), " Extra")
    await waitFor(() => {
      expect(screen.getByLabelText("URL slug")).toHaveValue("custom-slug")
    })
  })
})

// ─── Validation ───────────────────────────────────────────────────────────────

describe("validation errors", () => {
  it("shows required errors on empty submit", async () => {
    await renderForm()
    fireEvent.click(screen.getByRole("button", { name: /create drop/i }))
    await screen.findByText(/title is required/i)
    await screen.findByText(/slug is required/i)
    await screen.findByText(/enter a valid email/i)
  })

  it("shows slug format error for invalid characters", async () => {
    await renderForm()
    await userEvent.type(screen.getByLabelText("URL slug"), "UPPERCASE")
    fireEvent.click(screen.getByRole("button", { name: /create drop/i }))
    await screen.findByText(/lowercase letters, numbers, and hyphens only/i)
  })

  it("does not submit when validation fails", async () => {
    await renderForm()
    fireEvent.click(screen.getByRole("button", { name: /create drop/i }))
    await screen.findByText(/title is required/i)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

// ─── Price preview ────────────────────────────────────────────────────────────

describe("price preview", () => {
  it("updates buyer price as markup changes", async () => {
    await renderForm()
    const markupInput = screen.getByLabelText("Your markup")
    await userEvent.clear(markupInput)
    await userEvent.type(markupInput, "20")
    await waitFor(() => {
      const buyerRow = screen.getByText("Buyer pays").closest("div")
      expect(buyerRow?.textContent).toMatch(/\$\d+\.\d{2}/)
    })
  })
})

// ─── Submission ───────────────────────────────────────────────────────────────

describe("form submission", () => {
  it("calls POST /api/drops with correct payload and redirects", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "drop-123" }), { status: 200 })
    )
    await renderForm("jan")
    const { title, supportEmail, submitBtn } = fillRequiredFields()

    await userEvent.type(title, "My Drop")
    await userEvent.type(supportEmail, "support@example.com")
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/drops",
        expect.objectContaining({ method: "POST" })
      )
    })
    const body = JSON.parse(
      (vi.mocked(global.fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body).toMatchObject({
      title: "My Drop",
      supportEmail: "support@example.com",
    })
    expect(mockPush).toHaveBeenCalledWith("/drops/drop-123/design")
  })

  it("shows server error message when API returns error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Slug already taken" }), { status: 400 })
    )
    await renderForm()
    const { title, supportEmail, submitBtn } = fillRequiredFields()

    await userEvent.type(title, "My Drop")
    await userEvent.type(supportEmail, "support@example.com")
    fireEvent.click(submitBtn)

    await screen.findByText(/slug already taken/i)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows fallback error when API returns non-JSON error", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    )
    await renderForm()
    const { title, supportEmail, submitBtn } = fillRequiredFields()

    await userEvent.type(title, "My Drop")
    await userEvent.type(supportEmail, "support@example.com")
    fireEvent.click(submitBtn)

    await screen.findByText(/something went wrong/i)
  })
})
