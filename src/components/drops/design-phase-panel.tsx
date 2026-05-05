"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { DesignEditor } from "@/components/design-editor"
import { DesignPreviewCarousel } from "@/components/drops/design-preview-carousel"
import { useDesignPhase, type DesignPhaseState } from "@/hooks/use-design-phase"

export { useDesignPhase, type DesignPhaseState }

export function DesignPhasePanel({
  designPhase,
  canCreate,
}: {
  designPhase: DesignPhaseState
  canCreate: boolean
}) {
  const {
    phase,
    file,
    designPreview,
    mockup,
    rightsAccepted,
    setRightsAccepted,
    serverError,
    isBusy,
    designEditorRef,
    handleFileChange,
    handlePlacementChange,
  } = designPhase

  const showEditorPreview =
    phase !== "uploading" &&
    phase !== "generating" &&
    !(phase === "ready" && mockup !== null)

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(phase === "uploading" || phase === "generating") && (
          <div className="relative flex h-80 items-center justify-center rounded-lg border bg-muted/30">
            {designPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={designPreview.url}
                alt="Uploaded design preview"
                className="max-h-full max-w-full object-contain px-3"
              />
            )}
            <div className="absolute flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>
                {phase === "uploading" ? "Uploading design…" : "Generating mockup…"}
              </span>
            </div>
          </div>
        )}

        {phase === "ready" && mockup && designPreview && (
          <DesignPreviewCarousel
            key={mockup.mockupKey}
            designUrl={designPreview.url}
            mockupUrl={mockup.mockupUrl}
          />
        )}

        <DesignEditor
          ref={designEditorRef}
          variant="creation"
          onChange={handlePlacementChange}
          onFileChange={handleFileChange}
          disabled={isBusy}
          mockupUrl={mockup?.mockupUrl ?? null}
          showPreview={showEditorPreview}
          showActions={phase === "idle"}
        />

        {!file && (
          <p className="text-sm text-muted-foreground">
            Upload a PNG and save placement to generate a mockup.
          </p>
        )}
        {file && phase === "idle" && (
          <p className="text-sm text-muted-foreground">
            Save placement in the editor to generate a mockup.
          </p>
        )}

        {phase === "ready" && mockup && (
          <div className="flex items-start gap-3">
            <Checkbox
              id="rightsAccepted"
              checked={rightsAccepted}
              onCheckedChange={(checked) => setRightsAccepted(checked === true)}
            />
            <Label
              htmlFor="rightsAccepted"
              className="cursor-pointer text-sm leading-snug"
            >
              I own the rights to this design and accept the refund policy
            </Label>
          </div>
        )}
      </div>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" disabled={!canCreate} className="w-full">
        {phase === "creating" && <Loader2 className="size-4 animate-spin" />}
        {phase === "creating" ? "Creating drop…" : "Create drop"}
      </Button>
    </div>
  )
}
