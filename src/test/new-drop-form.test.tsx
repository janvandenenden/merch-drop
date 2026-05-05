import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("react-zoom-pan-pinch", async () => {
  const React = await import("react")
  const transformState = { positionX: 12, positionY: 18, scale: 0.01 }
  const TransformWrapper = React.forwardRef(
    ({ onInit, children }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        state: transformState,
        setTransform: vi.fn(),
      }))
      React.useEffect(() => {
        onInit?.({ state: transformState })
      }, [onInit])
      return children
    },
  )
  const TransformComponent = vi.fn(({ children }: any) => children)
  return { TransformWrapper, TransformComponent }
})

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockGetPreviewUploadUrl = vi.fn()
const mockGeneratePreviewMockup = vi.fn()
vi.mock("@/app/drops/[id]/design/actions", () => ({
  getPreviewUploadUrl: (...args: unknown[]) => mockGetPreviewUploadUrl(...args),
  generatePreviewMockup: (...args: unknown[]) =>
    mockGeneratePreviewMockup(...args),
}))

function makePngFile(name = "design.png") {
  return new File(["png-content"], name, { type: "image/png" })
}

async function renderForm(
  creatorSlug = "jan",
  userEmail = "creator@example.com",
) {
  const { NewDropForm } = await import("@/components/drops/new-drop-form")
  return render(<NewDropForm creatorSlug={creatorSlug} userEmail={userEmail} />)
}

async function uploadAndSavePlacement(container: HTMLElement) {
  const input = container.querySelector("input[type=file]")!
  await act(async () => {
    fireEvent.change(input, { target: { files: [makePngFile()] } })
  })
  await screen.findByRole("button", { name: "Save placement" })
  await userEvent.click(screen.getByRole("button", { name: "Save placement" }))
  // Wait for async pipeline (upload + mockup generation) to complete
  await screen.findByRole("checkbox", { name: /own the rights/i })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
  vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined)
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 1800
      naturalHeight = 2400
      onload: (() => void) | null = null
      set src(_: string) {
        this.onload?.()
      }
    },
  )
  mockGetPreviewUploadUrl.mockResolvedValue({
    uploadUrl: "https://upload.example",
    fileKey: "preview/design.png",
  })
  mockGeneratePreviewMockup.mockResolvedValue({
    printFileKey: "prints/drop.png",
    mockupKey: "mockups/drop.png",
    mockupUrl: "https://mockup.example/drop.png",
  })
  global.fetch = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 200 }))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  cleanup()
})

describe("NewDropForm rendering", () => {
  it("renders the one-step creation screen", async () => {
    await renderForm("mystore")

    expect(screen.getByLabelText("Title")).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(
      screen.getByText("merch-drop.com/mystore/your-drop"),
    ).toBeInTheDocument()
    expect(screen.getByText("creator@example.com")).toBeInTheDocument()
    expect(screen.getByText("Buyer pays")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create drop/i })).toBeDisabled()
  })

  it("shows clean price points and custom pricing entry", async () => {
    await renderForm()

    for (const price of ["$25", "$30", "$35", "$40", "$45"]) {
      expect(screen.getByRole("button", { name: price })).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: "Customize" })).toBeInTheDocument()
  })
})

describe("editable generated defaults", () => {
  it("auto-populates slug from title and allows dialog customization", async () => {
    await renderForm("jan")

    await userEvent.type(screen.getByLabelText("Title"), "Summer Drop 2026")
    await waitFor(() => {
      expect(
        screen.getByText("merch-drop.com/jan/summer-drop-2026"),
      ).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole("button", { name: "Edit URL slug" }))
    const slugInput = screen.getByLabelText("URL slug")
    await userEvent.clear(slugInput)
    await userEvent.type(slugInput, "custom-slug")
    await userEvent.click(screen.getByRole("button", { name: "Save URL" }))

    expect(
      screen.getByText("merch-drop.com/jan/custom-slug"),
    ).toBeInTheDocument()
  })

  it("uses the user email by default and allows dialog override", async () => {
    await renderForm("jan", "me@example.com")

    expect(screen.getByText("me@example.com")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Edit support email" }),
    )
    const emailInput = screen.getByLabelText("Support email")
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, "support@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Save email" }))

    expect(screen.getByText("support@example.com")).toBeInTheDocument()
  })

  it("validates slug format inside the edit dialog", async () => {
    await renderForm()

    await userEvent.click(screen.getByRole("button", { name: "Edit URL slug" }))
    await userEvent.clear(screen.getByLabelText("URL slug"))
    await userEvent.type(screen.getByLabelText("URL slug"), "UPPERCASE")
    await userEvent.click(screen.getByRole("button", { name: "Save URL" }))

    expect(
      await screen.findAllByText(
        /lowercase letters, numbers, and hyphens only/i,
      ),
    ).not.toHaveLength(0)
  })
})

describe("pricing", () => {
  it("updates buyer price when selecting a different price point", async () => {
    await renderForm()

    const before = screen.getByText("Buyer pays").parentElement?.textContent
    await userEvent.click(screen.getByRole("button", { name: "$45" }))

    await waitFor(() => {
      const after = screen.getByText("Buyer pays").parentElement?.textContent
      expect(after).not.toBe(before)
    })
  })
})

describe("submission", () => {
  it("does not submit without a design and saved placement", async () => {
    await renderForm()

    await userEvent.type(screen.getByLabelText("Title"), "My Drop")
    expect(screen.getByRole("button", { name: /create drop/i })).toBeDisabled()
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/drops",
      expect.anything(),
    )
  })

  it("shows loading states while upload and mockup generation are running", async () => {
    let resolveGenerate!: (value: {
      printFileKey: string
      mockupKey: string
      mockupUrl: string
    }) => void
    mockGeneratePreviewMockup.mockReturnValue(
      new Promise((resolve) => {
        resolveGenerate = resolve
      }),
    )

    const { container } = await renderForm()
    const input = container.querySelector("input[type=file]")!
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePngFile()] } })
    })
    await screen.findByRole("button", { name: "Save placement" })
    await userEvent.click(screen.getByRole("button", { name: "Save placement" }))

    expect(await screen.findByText(/generating mockup/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create drop/i })).toBeDisabled()

    await act(async () => {
      resolveGenerate({
        printFileKey: "prints/drop.png",
        mockupKey: "mockups/drop.png",
        mockupUrl: "https://mockup.example/drop.png",
      })
    })
    await screen.findByRole("checkbox", { name: /own the rights/i })
  })

  it("requires rights accepted before Create drop is enabled", async () => {
    const { container } = await renderForm()
    await userEvent.type(screen.getByLabelText("Title"), "My Drop")
    await uploadAndSavePlacement(container)

    const submitButton = screen.getByRole("button", { name: /create drop/i })
    expect(submitButton).toBeDisabled()

    await userEvent.click(
      screen.getByRole("checkbox", { name: /own the rights/i }),
    )
    expect(submitButton).not.toBeDisabled()
  })

  it("creates the drop and navigates to dashboard", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // R2 PUT upload
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "drop-123" }), { status: 200 }),
      ) // POST /api/drops

    const { container } = await renderForm("jan", "creator@example.com")
    await userEvent.type(screen.getByLabelText("Title"), "My Drop")
    await uploadAndSavePlacement(container)
    await userEvent.click(
      screen.getByRole("checkbox", { name: /own the rights/i }),
    )
    await userEvent.click(screen.getByRole("button", { name: /create drop/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/drops",
        expect.objectContaining({ method: "POST" }),
      )
    })
    const postCall = vi
      .mocked(global.fetch)
      .mock.calls.find(([url]) => url === "/api/drops")!
    const body = JSON.parse((postCall[1] as RequestInit).body as string)
    expect(body).toMatchObject({
      title: "My Drop",
      slug: "my-drop",
      supportEmail: "creator@example.com",
      designFileKey: "preview/design.png",
      printFileKey: "prints/drop.png",
      mockupKey: "mockups/drop.png",
    })

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"))
  })

  it("shows server error when drop creation fails and does not route away", async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // R2 PUT upload
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Slug already taken" }), {
          status: 400,
        }),
      ) // POST /api/drops

    const { container } = await renderForm()
    await userEvent.type(screen.getByLabelText("Title"), "My Drop")
    await uploadAndSavePlacement(container)
    await userEvent.click(
      screen.getByRole("checkbox", { name: /own the rights/i }),
    )
    await userEvent.click(screen.getByRole("button", { name: /create drop/i }))

    expect(await screen.findByText(/slug already taken/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows error when design upload fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    ) // R2 PUT fails

    const { container } = await renderForm()
    const input = container.querySelector("input[type=file]")!
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePngFile()] } })
    })
    await screen.findByRole("button", { name: "Save placement" })
    await userEvent.click(screen.getByRole("button", { name: "Save placement" }))

    expect(await screen.findByText(/design upload failed/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows error when mockup generation fails", async () => {
    mockGeneratePreviewMockup.mockRejectedValue(new Error("Printful error"))

    const { container } = await renderForm()
    const input = container.querySelector("input[type=file]")!
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePngFile()] } })
    })
    await screen.findByRole("button", { name: "Save placement" })
    await userEvent.click(screen.getByRole("button", { name: "Save placement" }))

    expect(await screen.findByText(/printful error/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
