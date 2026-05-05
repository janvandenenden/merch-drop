"use client"

import { type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DesignThumbnail({
  imageUrl,
  mockupUrl,
  isCreation,
  disabled,
  showPreview,
  showActions,
  replaceInputRef,
  onOpenEditor,
  onFileChange,
}: {
  imageUrl: string | null
  mockupUrl: string | null
  isCreation: boolean
  disabled: boolean
  showPreview: boolean
  showActions: boolean
  replaceInputRef: RefObject<HTMLInputElement | null>
  onOpenEditor: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className={cn("flex flex-col gap-3", isCreation && "h-full")}>
      {showPreview && (
        <button
          type="button"
          onClick={onOpenEditor}
          disabled={!imageUrl || disabled}
          className={cn(
            "relative overflow-hidden rounded-lg border border-neutral-200 transition hover:ring-2 hover:ring-neutral-400 disabled:pointer-events-none",
            isCreation
              ? "flex min-h-80 items-center justify-center bg-neutral-50"
              : "w-32",
          )}
        >
          {mockupUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mockupUrl}
              alt="Generated mockup"
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/tshirt-template.png"
                alt="T-shirt preview"
                className={cn(isCreation ? "max-h-80 w-auto" : "w-full")}
              />
              {isCreation && (
                <span className="absolute bottom-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-foreground/10">
                  Placement saved
                </span>
              )}
            </>
          )}
        </button>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-2">
          {imageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenEditor}
              disabled={disabled}
            >
              {mockupUrl ? "Readjust placement" : "Edit placement"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => replaceInputRef.current?.click()}
            disabled={disabled}
          >
            Replace image
          </Button>
        </div>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={onFileChange}
      />
    </div>
  )
}
