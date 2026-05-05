"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDrop, updateDrop } from "@/lib/drops"
import { storageKeys, getPresignedUploadUrl, getSignedUrl } from "@/lib/storage"
import { compositePrintFile, PRINT_CANVAS } from "@/lib/compositor"
import { generateMockup, generateMockupFromPrintFile } from "@/lib/mockup"
import { TSHIRT_DISPLAY, PRINT_AREA, type Placement } from "@/lib/design-constants"

const printAreaPxW = TSHIRT_DISPLAY * PRINT_AREA.width
const printAreaPxH = TSHIRT_DISPLAY * PRINT_AREA.height

function editorToCompositor(p: Placement) {
  const kX = PRINT_CANVAS.width / printAreaPxW
  const kY = PRINT_CANVAS.height / printAreaPxH
  return { x: p.x * kX, y: p.y * kY, scale: p.scale * kX, rotate: p.rotate }
}

async function getAuthorizedSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  return session
}

async function getAuthorizedDrop(dropId: string) {
  const session = await getAuthorizedSession()

  const drop = await getDrop(dropId)
  if (!drop || drop.userId !== session.user.id) throw new Error("Not found")

  return drop
}

export async function getPreviewUploadUrl() {
  const session = await getAuthorizedSession()
  const key = storageKeys.design(`preview-${session.user.id}-${Date.now()}.png`)
  const uploadUrl = await getPresignedUploadUrl(key, "image/png")
  return { uploadUrl, fileKey: key }
}

export async function generatePreviewMockup(fileKey: string, editorPlacement: Placement) {
  const session = await getAuthorizedSession()

  try {
    const printFileKey = await compositePrintFile(fileKey, editorToCompositor(editorPlacement))
    const { mockupKey, mockupUrl } = await generateMockupFromPrintFile(printFileKey, session.user.id)
    return { printFileKey, mockupKey, mockupUrl }
  } catch (err) {
    console.error("[generatePreviewMockup] failed:", err)
    throw err
  }
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
  try {
    const drop = await getAuthorizedDrop(dropId)
    if (drop.firstSaleAt) throw new Error("Design locked after first sale")

    await updateDrop(dropId, { designFileKey, placement: editorPlacement })

    const printFileKey = await compositePrintFile(designFileKey, editorToCompositor(editorPlacement))
    await updateDrop(dropId, { printFileKey })

    const mockupUrl = await generateMockup(dropId)

    return { mockupUrl }
  } catch (err) {
    console.error("[runPipeline] failed:", err)
    throw err
  }
}
