"use client"

import { useState } from "react"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { AlignCenter, AlignCenterVertical, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MIN_DPI,
  MIN_PX_W,
  MIN_PX_H,
  PRINT_AREA,
  PRINT_INCHES_W,
  PRINT_INCHES_H,
  TSHIRT_DISPLAY,
  type Placement,
} from "@/lib/design-constants"
import {
  computeInitScale,
  computeEffectiveDPI,
  computePrintedWidthIn,
  useDesignEditor,
} from "@/hooks/use-design-editor"

interface DesignEditorProps {
  onChange?: (placement: Placement | null) => void
  onFileChange?: (file: File) => void
}

function ScaleSlider({
  scale,
  sliderMax,
  printedWidthIn,
  onChange,
}: {
  scale: number
  sliderMax: number
  printedWidthIn: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">Scale</span>
        <span className="text-xs text-neutral-500">
          {printedWidthIn > 0 ? `${printedWidthIn.toFixed(1)}" wide` : "—"}
        </span>
      </div>
      <input
        type="range"
        min={0.001}
        max={sliderMax}
        step={0.001}
        value={scale}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-neutral-900"
      />
    </div>
  )
}

export function DesignEditor({ onChange, onFileChange }: DesignEditorProps) {
  const {
    imageUrl,
    naturalW,
    naturalH,
    uploadError,
    isOpen,
    rotate,
    transformRef,
    replaceInputRef,
    handleFileChange,
    handleDrop,
    handleRotate,
    handleCenterH,
    handleCenterV,
    handleScaleChange,
    handleSubmit,
    setIsOpen,
  } = useDesignEditor(onChange, onFileChange)

  const [liveScale, setLiveScale] = useState(1)

  const printAreaPxW = TSHIRT_DISPLAY * PRINT_AREA.width
  const printAreaPxH = TSHIRT_DISPLAY * PRINT_AREA.height

  const isRotated = rotate % 180 !== 0
  const effectiveW = isRotated ? naturalH : naturalW
  const effectiveH = isRotated ? naturalW : naturalH

  const initScale = computeInitScale(printAreaPxW, printAreaPxH, effectiveW || 1, effectiveH || 1)
  const maxDPIScale = printAreaPxW / (MIN_DPI * PRINT_INCHES_W)
  const sliderMax = Math.max(initScale * 1.1, maxDPIScale)
  const effectiveDPI = computeEffectiveDPI(liveScale, printAreaPxW)
  const belowMinRes = liveScale > maxDPIScale
  const printedWidthIn = naturalW > 0 ? computePrintedWidthIn(naturalW, liveScale, printAreaPxW) : 0

  return (
    <>
      {/* Upload drop zone / trigger */}
      {!imageUrl ? (
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-10 text-sm text-neutral-500 cursor-pointer hover:bg-neutral-100 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="font-medium text-neutral-700">Upload PNG design</span>
          <span>Drag and drop or click to browse</span>
          <input type="file" accept="image/png" className="sr-only" onChange={handleFileChange} />
        </label>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Preview thumbnail — click to re-open editor */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative w-32 overflow-hidden rounded-lg border border-neutral-200 hover:ring-2 hover:ring-neutral-400 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tshirt-template.png" alt="T-shirt preview" className="w-full" />
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              Edit placement
            </Button>
            <Button variant="outline" size="sm" onClick={() => replaceInputRef.current?.click()}>
              Replace image
            </Button>
          </div>
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/png"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>
      )}

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* Editor modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Place your design</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-0">
            {/* T-shirt + print area */}
            <div className="relative flex-shrink-0 bg-neutral-100 flex items-center justify-center p-6">
              <div
                className="relative select-none"
                style={{ width: TSHIRT_DISPLAY, height: TSHIRT_DISPLAY }}
              >
                {/* T-shirt background */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/tshirt-template.png"
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Print area — clipping container */}
                <div
                  className="absolute overflow-hidden border border-dashed border-blue-400/60"
                  style={{
                    left: TSHIRT_DISPLAY * PRINT_AREA.left,
                    top: TSHIRT_DISPLAY * PRINT_AREA.top,
                    width: printAreaPxW,
                    height: printAreaPxH,
                  }}
                >
                  {imageUrl && (
                    <TransformWrapper
                      ref={transformRef}
                      initialScale={initScale}
                      minScale={0.001}
                      maxScale={sliderMax * 2}
                      limitToBounds={false}
                      onInit={(ref) => setLiveScale(ref.state.scale)}
                      onTransform={(_, state) => setLiveScale(state.scale)}
                    >
                      <TransformComponent
                        wrapperStyle={{ width: "100%", height: "100%" }}
                        contentStyle={{ width: "100%", height: "100%" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Design"
                          draggable={false}
                          style={{
                            transform: `rotate(${rotate}deg)`,
                            transformOrigin: "center",
                            maxWidth: "none",
                            width: effectiveW > 0 ? `${effectiveW}px` : "auto",
                          }}
                        />
                      </TransformComponent>
                    </TransformWrapper>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col justify-center gap-6 px-8 py-6 flex-1">
              <ScaleSlider
                scale={liveScale}
                sliderMax={sliderMax}
                printedWidthIn={printedWidthIn}
                onChange={handleScaleChange}
              />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-neutral-700">Position</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCenterH(printAreaPxW, effectiveW)}
                  >
                    <AlignCenter className="size-4" />
                    Horizontal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCenterV(printAreaPxH, effectiveH)}
                  >
                    <AlignCenterVertical className="size-4" />
                    Vertical
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-neutral-700">Transform</span>
                <Button variant="outline" size="sm" className="w-fit" onClick={handleRotate}>
                  <RotateCcw className="size-4" />
                  Rotate 90°
                </Button>
              </div>

              {belowMinRes && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <strong>Low resolution</strong> at this size (~{Math.round(effectiveDPI)}&nbsp;DPI).
                  Scale down or upload a higher-res image ({MIN_PX_W}×{MIN_PX_H}px for full {PRINT_INCHES_W}"×{PRINT_INCHES_H}").
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={belowMinRes}>
              Save placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
