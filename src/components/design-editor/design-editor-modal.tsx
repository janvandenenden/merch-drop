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
import { ScaleSlider } from "@/components/design-editor/scale-slider"
import {
  MIN_DPI,
  MIN_PX_W,
  MIN_PX_H,
  PRINT_AREA,
  PRINT_INCHES_W,
  PRINT_INCHES_H,
  TSHIRT_DISPLAY,
} from "@/lib/design-constants"
import {
  computeInitScale,
  computeEffectiveDPI,
  computePrintedWidthIn,
} from "@/hooks/use-design-editor"
import type { useDesignEditor } from "@/hooks/use-design-editor"
import { cn } from "@/lib/utils"

type DesignEditorState = ReturnType<typeof useDesignEditor>

export function DesignEditorModal({
  editor,
  isCreation,
}: {
  editor: DesignEditorState
  isCreation: boolean
}) {
  const {
    isOpen,
    imageUrl,
    naturalW,
    naturalH,
    rotate,
    transformRef,
    setIsOpen,
    handleScaleChange,
    handleCenterH,
    handleCenterV,
    handleRotate,
    handleSubmit,
  } = editor
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0",
          isCreation
            ? "h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] rounded-lg sm:max-w-[calc(100%-2rem)]"
            : "sm:max-w-2xl",
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Place your design</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            "flex flex-col gap-0",
            isCreation ? "min-h-0 flex-1 lg:flex-row" : "sm:flex-row",
          )}
        >
          {/* T-shirt + print area */}
          <div className="relative flex flex-1 items-center justify-center bg-neutral-100 p-6">
            <div
              className="relative select-none"
              style={{ width: TSHIRT_DISPLAY, height: TSHIRT_DISPLAY }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tshirt-template.png"
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full pointer-events-none"
              />
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
          <div className="flex flex-1 flex-col justify-center gap-6 px-8 py-6">
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
                Scale down or upload a higher-res image ({MIN_PX_W}×{MIN_PX_H}px for full{" "}
                {PRINT_INCHES_W}"×{PRINT_INCHES_H}").
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={belowMinRes}>
            Save placement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
