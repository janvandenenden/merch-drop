"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DesignPreviewCarouselProps {
  designUrl: string
  mockupUrl: string
}

export function DesignPreviewCarousel({
  designUrl,
  mockupUrl,
}: DesignPreviewCarouselProps) {
  const [slide, setSlide] = useState<0 | 1>(0)
  const [mockupLoaded, setMockupLoaded] = useState(false)

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      {/* Fixed-height viewport — both slides live in the same box so height never jumps */}
      <div className="relative h-80 overflow-hidden rounded-md bg-background">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slide * 100}%)` }}
        >
          {/* Slide 1: uploaded design */}
          <div className="flex h-full w-full shrink-0 items-center justify-center px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={designUrl}
              alt="Your design"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Slide 2: Printful mockup */}
          <div className="relative flex h-full w-full shrink-0 items-center justify-center px-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mockupUrl}
              alt="Mockup"
              className={cn(
                "max-h-full max-w-full object-contain",
                !mockupLoaded && "invisible",
              )}
              onLoad={() => setMockupLoaded(true)}
            />
            {!mockupLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation row — sits below the viewport, never overlaps images */}
      <div className="flex items-center justify-between px-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={slide === 0}
          onClick={() => setSlide(0)}
        >
          <ChevronLeft />
          <span className="sr-only">Previous</span>
        </Button>

        <span className="text-xs text-muted-foreground">
          {slide + 1} / 2
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={slide === 1 || !mockupLoaded}
          onClick={() => setSlide(1)}
        >
          <ChevronRight />
          <span className="sr-only">Next</span>
        </Button>
      </div>
    </div>
  )
}

