"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDrop, updateDrop } from "@/lib/drops"
import { storageKeys, getPresignedUploadUrl } from "@/lib/storage"
import { compositePrintFile, PRINT_CANVAS } from "@/lib/compositor"
import { generateMockup } from "@/lib/mockup"
import { TSHIRT_DISPLAY, PRINT_AREA, type Placement } from "@/lib/design-constants"

const printAreaPxW = TSHIRT_DISPLAY * PRINT_AREA.width
const printAreaPxH = TSHIRT_DISPLAY * PRINT_AREA.height

async function getAuthorizedDrop(dropId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const drop = await getDrop(dropId)
  if (!drop || drop.userId !== session.user.id) throw new Error("Not found")

  return drop
}

export async function getDesignUploadUrl(dropId: string) {
  const drop = await getAuthorizedDrop(dropId)
  if (drop.firstSaleAt) throw new Error("Design locked after first sale")

  const key = storageKeys.design(`${dropId}-${Date.now()}.png`)
  const uploadUrl = await getPresignedUploadUrl(key, "image/png")

  return { uploadUrl, fileKey: key }
}

export async function runPipeline(
  dropId: string,
  designFileKey: string,
  editorPlacement: Placement
) {
  const drop = await getAuthorizedDrop(dropId)
  if (drop.firstSaleAt) throw new Error("Design locked after first sale")

  const kX = PRINT_CANVAS.width / printAreaPxW
  const kY = PRINT_CANVAS.height / printAreaPxH

  const compositorPlacement = {
    x: editorPlacement.x * kX,
    y: editorPlacement.y * kY,
    scale: editorPlacement.scale * kX,
    rotate: editorPlacement.rotate,
  }

  await updateDrop(dropId, { designFileKey, placement: editorPlacement })

  const printFileKey = await compositePrintFile(designFileKey, compositorPlacement)
  await updateDrop(dropId, { printFileKey })

  const mockupUrl = await generateMockup(dropId)

  return { mockupUrl }
}
