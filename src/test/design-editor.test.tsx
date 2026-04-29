import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

// Hoisted — must appear before any import that pulls in react-zoom-pan-pinch
vi.mock("react-zoom-pan-pinch", () => {
  const TransformWrapper = vi.fn(({ onInit, children }: any) => {
    onInit?.({ state: { scale: 0.01 } })
    return children
  })
  const TransformComponent = vi.fn(({ children }: any) => children)
  return { TransformWrapper, TransformComponent }
})

import {
  MIN_DPI,
  MIN_PX_H,
  MIN_PX_W,
  PRINT_INCHES_W,
  computeEffectiveDPI,
  computeInitScale,
  computePrintedWidthIn,
  useDesignEditor,
} from "@/hooks/use-design-editor"
import { DesignEditor } from "@/components/design-editor"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRINT_AREA_PX_W = 128 // 320 * 0.40 — matches TSHIRT_DISPLAY * PRINT_AREA.width

function makePngFile(name = "design.png") {
  return new File(["png-content"], name, { type: "image/png" })
}

function makeJpegFile(name = "photo.jpg") {
  return new File(["jpeg-content"], name, { type: "image/jpeg" })
}

// ---------------------------------------------------------------------------
// computeInitScale
// ---------------------------------------------------------------------------

describe("computeInitScale", () => {
  it("fits by width when image is wider relative to print area", () => {
    // 1800×1200 image, 128×170 print area — width is the tighter constraint
    const scale = computeInitScale(128, 170, 1800, 1200)
    expect(scale).toBeCloseTo(128 / 1800)
  })

  it("fits by height when image is taller relative to print area", () => {
    // 900×2400 image, 128×170 print area — height is the tighter constraint
    const scale = computeInitScale(128, 170, 900, 2400)
    expect(scale).toBeCloseTo(170 / 2400)
  })

  it("caps at 1 when image is smaller than print area", () => {
    const scale = computeInitScale(128, 170, 64, 85)
    expect(scale).toBe(1)
  })

  it("fills print area exactly for the minimum-res image (1800×2400)", () => {
    // At initScale the design should just fit — 128/1800 by width
    const scale = computeInitScale(128, 170, MIN_PX_W, MIN_PX_H)
    expect(scale).toBeCloseTo(128 / MIN_PX_W)
  })

  it("swapped dims (rotation) fit correctly", () => {
    // 2400×1800 (landscape after 90° rotate): effectiveW=2400, effectiveH=1800
    const scale = computeInitScale(128, 170, 2400, 1800)
    expect(scale).toBeCloseTo(128 / 2400)
  })
})

// ---------------------------------------------------------------------------
// computeEffectiveDPI
// ---------------------------------------------------------------------------

describe("computeEffectiveDPI", () => {
  const maxDPIScale = PRINT_AREA_PX_W / (MIN_DPI * PRINT_INCHES_W)

  it("returns exactly MIN_DPI at maxDPIScale", () => {
    expect(computeEffectiveDPI(maxDPIScale, PRINT_AREA_PX_W)).toBeCloseTo(MIN_DPI)
  })

  it("returns higher DPI at half maxDPIScale (smaller design)", () => {
    expect(computeEffectiveDPI(maxDPIScale / 2, PRINT_AREA_PX_W)).toBeCloseTo(MIN_DPI * 2)
  })

  it("returns lower DPI at double maxDPIScale (larger design)", () => {
    expect(computeEffectiveDPI(maxDPIScale * 2, PRINT_AREA_PX_W)).toBeCloseTo(MIN_DPI / 2)
  })

  it("returns Infinity for scale 0", () => {
    expect(computeEffectiveDPI(0, PRINT_AREA_PX_W)).toBe(Infinity)
  })

  it("is image-size independent — same scale yields same DPI regardless of naturalW", () => {
    const scale = maxDPIScale
    const dpi1 = computeEffectiveDPI(scale, PRINT_AREA_PX_W)
    const dpi2 = computeEffectiveDPI(scale, PRINT_AREA_PX_W)
    expect(dpi1).toBe(dpi2)
  })
})

// ---------------------------------------------------------------------------
// computePrintedWidthIn
// ---------------------------------------------------------------------------

describe("computePrintedWidthIn", () => {
  it("1800px image at fill scale prints at full print width (12\")", () => {
    const fillScale = PRINT_AREA_PX_W / MIN_PX_W
    const inches = computePrintedWidthIn(MIN_PX_W, fillScale, PRINT_AREA_PX_W)
    expect(inches).toBeCloseTo(PRINT_INCHES_W)
  })

  it("scales linearly with image width", () => {
    const scale = 0.05
    const small = computePrintedWidthIn(900, scale, PRINT_AREA_PX_W)
    const large = computePrintedWidthIn(1800, scale, PRINT_AREA_PX_W)
    expect(large).toBeCloseTo(small * 2)
  })

  it("halving scale halves printed width", () => {
    const w1 = computePrintedWidthIn(1800, 0.06, PRINT_AREA_PX_W)
    const w2 = computePrintedWidthIn(1800, 0.03, PRINT_AREA_PX_W)
    expect(w1).toBeCloseTo(w2 * 2)
  })
})

// ---------------------------------------------------------------------------
// useDesignEditor — file validation
// ---------------------------------------------------------------------------

describe("useDesignEditor — file validation", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined)
  })

  it("sets uploadError and does not open modal for non-PNG", () => {
    const { result } = renderHook(() => useDesignEditor())
    act(() => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [makeJpegFile()] },
      } as unknown as React.DragEvent)
    })
    expect(result.current.uploadError).toBe("PNG files only. Please upload a .png file.")
    expect(result.current.isOpen).toBe(false)
  })

  it("clears uploadError on valid PNG drop", () => {
    const { result } = renderHook(() => useDesignEditor())

    // First set an error
    act(() => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [makeJpegFile()] },
      } as unknown as React.DragEvent)
    })
    expect(result.current.uploadError).not.toBeNull()

    // Then a valid PNG — error should clear (Image.onload fires async so just check error cleared)
    act(() => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [makePngFile()] },
      } as unknown as React.DragEvent)
    })
    expect(result.current.uploadError).toBeNull()
  })

  it("does not open modal when no file is provided via input", () => {
    const { result } = renderHook(() => useDesignEditor())
    act(() => {
      result.current.handleFileChange({
        target: { files: null, value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.uploadError).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// useDesignEditor — rotation
// ---------------------------------------------------------------------------

describe("useDesignEditor — handleRotate", () => {
  it("cycles 0 → 270 → 180 → 90 → 0", () => {
    const { result } = renderHook(() => useDesignEditor())
    expect(result.current.rotate).toBe(0)

    act(() => result.current.handleRotate())
    expect(result.current.rotate).toBe(270)

    act(() => result.current.handleRotate())
    expect(result.current.rotate).toBe(180)

    act(() => result.current.handleRotate())
    expect(result.current.rotate).toBe(90)

    act(() => result.current.handleRotate())
    expect(result.current.rotate).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// DesignEditor component — smoke tests
// ---------------------------------------------------------------------------

describe("DesignEditor component", () => {
  afterEach(cleanup)

  it("renders upload zone initially", () => {
    render(<DesignEditor />)
    expect(screen.getByText("Upload PNG design")).toBeInTheDocument()
  })

  it("shows error message when a non-PNG file is uploaded", () => {
    const { container } = render(<DesignEditor />)

    const input = container.querySelector("input[type=file]")!
    fireEvent.change(input, { target: { files: [makeJpegFile()] } })

    expect(screen.getByText(/PNG files only/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// useDesignEditor — onFileChange callback
// ---------------------------------------------------------------------------

describe("useDesignEditor — onFileChange callback", () => {
  beforeEach(() => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("fires onFileChange with the File when a valid PNG is dropped", async () => {
    const onFileChange = vi.fn()
    const { result } = renderHook(() => useDesignEditor(undefined, onFileChange))
    const file = makePngFile()

    await act(async () => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [file] },
      } as unknown as React.DragEvent)
    })

    expect(onFileChange).toHaveBeenCalledOnce()
    expect(onFileChange).toHaveBeenCalledWith(file)
  })

  it("does not fire onFileChange for non-PNG files", async () => {
    const onFileChange = vi.fn()
    const { result } = renderHook(() => useDesignEditor(undefined, onFileChange))

    await act(async () => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [makeJpegFile()] },
      } as unknown as React.DragEvent)
    })

    expect(onFileChange).not.toHaveBeenCalled()
  })

  it("fires onFileChange again when image is replaced", async () => {
    const onFileChange = vi.fn()
    const { result } = renderHook(() => useDesignEditor(undefined, onFileChange))
    const first = makePngFile()
    const second = new File(["png2"], "second.png", { type: "image/png" })

    await act(async () => {
      result.current.handleDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [first] },
      } as unknown as React.DragEvent)
    })
    await act(async () => {
      result.current.handleFileChange({
        target: { files: [second], value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    expect(onFileChange).toHaveBeenCalledTimes(2)
    expect(onFileChange).toHaveBeenNthCalledWith(2, second)
  })
})

// ---------------------------------------------------------------------------
// DesignEditor component — Save placement button / belowMinRes
// ---------------------------------------------------------------------------

describe("DesignEditor — Save placement button respects resolution", () => {
  // maxDPIScale = (320 * 0.40) / (150 * 12) ≈ 0.0711
  // TransformWrapper mock (top of file) calls onInit with scale=0.01 → button enabled
  // Overriding per-test to call onInit with scale=1 → button disabled

  beforeEach(() => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    cleanup()
  })

  async function uploadPng(container: HTMLElement) {
    const input = container.querySelector("input[type=file]")!
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePngFile()] } })
    })
  }

  it("enables Save placement when scale is below maxDPIScale", async () => {
    // Default mock calls onInit with scale=0.01 which is below maxDPIScale ≈ 0.071
    const { container } = render(<DesignEditor />)
    await uploadPng(container)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save placement" })).not.toBeDisabled()
    })
  })

  it("disables Save placement when scale exceeds maxDPIScale (low resolution)", async () => {
    const { TransformWrapper } = await import("react-zoom-pan-pinch")
    ;(TransformWrapper as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      ({ onInit, children }: any) => {
        onInit?.({ state: { scale: 1 } }) // scale=1 >> maxDPIScale → belowMinRes
        return children
      },
    )

    const { container } = render(<DesignEditor />)
    await uploadPng(container)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save placement" })).toBeDisabled()
    })
  })
})
