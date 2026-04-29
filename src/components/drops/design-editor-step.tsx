"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { DesignEditor } from "@/components/design-editor"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Placement } from "@/hooks/use-design-editor"

interface DesignEditorStepProps {
  dropId: string
  locked: boolean
}

export function DesignEditorStep({ dropId, locked }: DesignEditorStepProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!file || !placement) return
    setIsSaving(true)
    setSaveError(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("placement", JSON.stringify(placement))

    const res = await fetch(`/api/drops/${dropId}/design`, {
      method: "POST",
      body: formData,
    })

    setIsSaving(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(body.error ?? "Save failed")
      return
    }

    router.push("/dashboard")
  }

  if (locked) {
    return (
      <Alert>
        <Lock className="size-4" />
        <AlertDescription>
          Design is locked after the first sale and cannot be changed.
        </AlertDescription>
      </Alert>
    )
  }

  const canSave = file !== null && placement !== null

  return (
    <div className="space-y-6">
      <DesignEditor onChange={setPlacement} onFileChange={setFile} />

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? "Saving..." : "Save design"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
