"use client"

import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function DesignUploadZone({
  isCreation,
  disabled,
  onFileChange,
  onDrop,
}: {
  isCreation: boolean
  disabled: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500 transition-colors hover:bg-neutral-100",
        isCreation ? "min-h-80 p-8" : "p-10",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {isCreation && <ImageIcon className="size-8 text-neutral-400" />}
      <span className="font-medium text-neutral-700">Upload PNG design</span>
      <span>Drag and drop or click to browse</span>
      <input
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={onFileChange}
        disabled={disabled}
      />
    </label>
  )
}
