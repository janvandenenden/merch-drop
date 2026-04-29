"use client"

import { useState } from "react"
import Link from "next/link"
import { DesignEditor } from "@/components/design-editor"
import { Button } from "@/components/ui/button"
import { getDesignUploadUrl, runPipeline } from "@/app/drops/[id]/design/actions"
import type { Placement } from "@/lib/design-constants"

type Phase = "idle" | "uploading" | "processing" | "preview"

export function DesignStep({
  dropId,
  initialMockupUrl,
  locked,
}: {
  dropId: string
  initialMockupUrl?: string
  locked: boolean
}) {
  const [phase, setPhase] = useState<Phase>(initialMockupUrl ? "preview" : "idle")
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mockupUrl, setMockupUrl] = useState<string | null>(initialMockupUrl ?? null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!file || !placement) return
    setError(null)
    try {
      setPhase("uploading")
      const { uploadUrl, fileKey } = await getDesignUploadUrl(dropId)
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/png" },
      })
      setPhase("processing")
      const { mockupUrl: newMockupUrl } = await runPipeline(dropId, fileKey, placement)
      setMockupUrl(newMockupUrl)
      setPhase("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setPhase("idle")
    }
  }

  if (locked && mockupUrl) {
    return (
      <div className="space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mockupUrl} alt="Mockup" className="rounded-lg border" />
        <p className="text-sm text-muted-foreground">Design locked after first sale.</p>
      </div>
    )
  }

  if (phase === "uploading") {
    return <p className="text-sm text-muted-foreground animate-pulse">Uploading design…</p>
  }

  if (phase === "processing") {
    return <p className="text-sm text-muted-foreground animate-pulse">Generating mockup…</p>
  }

  if (phase === "preview" && mockupUrl) {
    return (
      <div className="space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mockupUrl} alt="Mockup" className="rounded-lg border" />
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPhase("idle")}>
            Edit placement
          </Button>
          <Button asChild>
            <Link href={`/drops/${dropId}/publish`}>Continue →</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DesignEditor onChange={setPlacement} onFileChange={setFile} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={!file || !placement} onClick={handleGenerate}>
        Generate mockup
      </Button>
    </div>
  )
}
