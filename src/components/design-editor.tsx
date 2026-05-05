"use client"

import { forwardRef, useImperativeHandle } from "react"
import { DesignUploadZone } from "@/components/design-editor/design-upload-zone"
import { DesignThumbnail } from "@/components/design-editor/design-thumbnail"
import { DesignEditorModal } from "@/components/design-editor/design-editor-modal"
import { useDesignEditor } from "@/hooks/use-design-editor"
import type { Placement } from "@/lib/design-constants"

interface DesignEditorProps {
  onChange?: (placement: Placement | null) => void
  onFileChange?: (file: File) => void
  variant?: "default" | "creation"
  mockupUrl?: string | null
  disabled?: boolean
  showPreview?: boolean
  showActions?: boolean
}

export interface DesignEditorHandle {
  openEditor: () => void
  triggerReplace: () => void
}

export const DesignEditor = forwardRef<DesignEditorHandle, DesignEditorProps>(
  function DesignEditor(
    {
      onChange,
      onFileChange,
      variant = "default",
      mockupUrl,
      disabled = false,
      showPreview = true,
      showActions = true,
    },
    ref,
  ) {
    const editor = useDesignEditor(onChange, onFileChange)
    const { imageUrl, uploadError, replaceInputRef, handleFileChange, handleDrop, setIsOpen } = editor
    const isCreation = variant === "creation"

    useImperativeHandle(ref, () => ({
      openEditor: () => {
        if (!imageUrl || disabled) return
        setIsOpen(true)
      },
      triggerReplace: () => {
        if (disabled) return
        replaceInputRef.current?.click()
      },
    }))

    return (
      <>
        {!imageUrl && !mockupUrl ? (
          <DesignUploadZone
            isCreation={isCreation}
            disabled={disabled}
            onFileChange={handleFileChange}
            onDrop={handleDrop}
          />
        ) : (
          <DesignThumbnail
            imageUrl={imageUrl}
            mockupUrl={mockupUrl ?? null}
            isCreation={isCreation}
            disabled={disabled}
            showPreview={showPreview}
            showActions={showActions}
            replaceInputRef={replaceInputRef}
            onOpenEditor={() => imageUrl && setIsOpen(true)}
            onFileChange={handleFileChange}
          />
        )}

        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        <DesignEditorModal editor={editor} isCreation={isCreation} />
      </>
    )
  },
)
