import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { getDrop, updateDrop } from "@/lib/drops"
import { uploadFile, storageKeys } from "@/lib/storage"

const placementSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number().positive(),
  rotate: z.number(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const record = await getDrop(id)
  if (!record) {
    return NextResponse.json({ error: "Drop not found" }, { status: 404 })
  }
  if (record.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (record.firstSaleAt) {
    return NextResponse.json(
      { error: "Design is locked after first sale" },
      { status: 409 },
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")
  const placementRaw = formData.get("placement")

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 })
  }
  if (file.type !== "image/png") {
    return NextResponse.json({ error: "PNG files only" }, { status: 400 })
  }
  if (typeof placementRaw !== "string") {
    return NextResponse.json({ error: "placement is required" }, { status: 400 })
  }

  let placement: z.infer<typeof placementSchema>
  try {
    placement = placementSchema.parse(JSON.parse(placementRaw))
  } catch {
    return NextResponse.json({ error: "Invalid placement" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = storageKeys.design(id)

  try {
    await uploadFile(key, buffer, "image/png")
    const updated = await updateDrop(id, { designFileKey: key, placement })
    return NextResponse.json({ designFileKey: updated.designFileKey })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
