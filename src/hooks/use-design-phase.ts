"use client"

import { useEffect, useRef, useState } from "react"
import {
  getPreviewUploadUrl,
  generatePreviewMockup,
} from "@/app/drops/[id]/design/actions"
import type { DesignEditorHandle } from "@/components/design-editor"
import type { Placement } from "@/lib/design-constants"
import type { Phase, DesignPreview, MockupState } from "@/components/drops/new-drop-form-schema"

export function useDesignPhase() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [designPreview, setDesignPreview] = useState<DesignPreview | null>(null)
  const [mockup, setMockup] = useState<MockupState | null>(null)
  const [rightsAccepted, setRightsAccepted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const designEditorRef = useRef<DesignEditorHandle>(null)

  useEffect(() => {
    return () => {
      if (designPreview) URL.revokeObjectURL(designPreview.url)
    }
  }, [designPreview])

  const isBusy = phase === "uploading" || phase === "generating" || phase === "creating"

  function handleFileChange(nextFile: File) {
    const nextPreviewUrl = URL.createObjectURL(nextFile)
    const img = new window.Image()
    img.onload = () => {
      setDesignPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url)
        return { url: nextPreviewUrl, naturalW: img.naturalWidth, naturalH: img.naturalHeight }
      })
    }
    img.src = nextPreviewUrl
    setFile(nextFile)
    setMockup(null)
    setRightsAccepted(false)
    setPhase("idle")
    setServerError(null)
  }

  async function handlePlacementChange(nextPlacement: Placement | null) {
    if (!nextPlacement || !file) {
      setMockup(null)
      setRightsAccepted(false)
      setPhase("idle")
      return
    }

    setServerError(null)
    setRightsAccepted(false)
    setMockup(null)

    try {
      setPhase("uploading")
      const { uploadUrl, fileKey } = await getPreviewUploadUrl()
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/png" },
      })
      if (!uploadRes.ok) throw new Error("Design upload failed.")

      setPhase("generating")
      const { printFileKey, mockupKey, mockupUrl } = await generatePreviewMockup(fileKey, nextPlacement)

      setMockup({ designFileKey: fileKey, printFileKey, mockupKey, mockupUrl, placement: nextPlacement })
      setPhase("ready")
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong")
      setPhase("idle")
    }
  }

  return {
    phase,
    setPhase,
    file,
    designPreview,
    mockup,
    rightsAccepted,
    setRightsAccepted,
    serverError,
    setServerError,
    isBusy,
    designEditorRef,
    handleFileChange,
    handlePlacementChange,
  }
}

export type DesignPhaseState = ReturnType<typeof useDesignPhase>
