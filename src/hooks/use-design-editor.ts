"use client"

import { useRef, useState } from "react"
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch"
import {
  PRINT_INCHES_W,
  PRINT_AREA,
  MIN_DPI,
  type Placement,
} from "@/lib/design-constants"

export {
  PRINT_INCHES_W,
  PRINT_INCHES_H,
  MIN_DPI,
  MIN_PX_W,
  MIN_PX_H,
  PRINT_AREA,
  TSHIRT_DISPLAY,
  type Placement,
} from "@/lib/design-constants"

// Pure math helpers — exported for testing
export function computeInitScale(
  printAreaPxW: number,
  printAreaPxH: number,
  effectiveW: number,
  effectiveH: number
): number {
  return Math.min(printAreaPxW / effectiveW, printAreaPxH / effectiveH, 1)
}

export function computeEffectiveDPI(scale: number, printAreaPxW: number): number {
  if (scale <= 0) return Infinity
  return printAreaPxW / (scale * PRINT_INCHES_W)
}

export function computePrintedWidthIn(
  naturalW: number,
  scale: number,
  printAreaPxW: number
): number {
  return (naturalW * scale / printAreaPxW) * PRINT_INCHES_W
}

export function useDesignEditor(
  onChange?: (placement: Placement | null) => void,
  onFileChange?: (file: File) => void
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [naturalW, setNaturalW] = useState(0)
  const [naturalH, setNaturalH] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [rotate, setRotate] = useState(0)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  function loadFile(file: File) {
    if (file.type !== "image/png") {
      setUploadError("PNG files only. Please upload a .png file.")
      return
    }
    setUploadError(null)
    setCurrentFile(file)

    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      setNaturalW(img.naturalWidth)
      setNaturalH(img.naturalHeight)
      setImageUrl(url)
      setRotate(0)
      setIsOpen(true)
      onFileChange?.(file)
    }
    img.src = url
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    loadFile(file)
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  function handleRotate() {
    setRotate((r) => (r - 90 + 360) % 360)
  }

  function handleCenterH(printAreaPxW: number, designPxW: number) {
    if (!transformRef.current) return
    const { positionY, scale } = transformRef.current.state
    const centeredX = (printAreaPxW - designPxW * scale) / 2
    transformRef.current.setTransform(centeredX, positionY, scale)
  }

  function handleCenterV(printAreaPxH: number, designPxH: number) {
    if (!transformRef.current) return
    const { positionX, scale } = transformRef.current.state
    const centeredY = (printAreaPxH - designPxH * scale) / 2
    transformRef.current.setTransform(positionX, centeredY, scale)
  }

  function handleScaleChange(value: number) {
    if (!transformRef.current) return
    const { positionX, positionY } = transformRef.current.state
    transformRef.current.setTransform(positionX, positionY, value)
  }

  function handleSubmit() {
    if (!transformRef.current) return
    const { positionX, positionY, scale } = transformRef.current.state
    onChange?.({ x: positionX, y: positionY, scale, rotate })
    setIsOpen(false)
  }

  return {
    imageUrl,
    naturalW,
    naturalH,
    uploadError,
    isOpen,
    rotate,
    currentFile,
    transformRef,
    replaceInputRef,
    handleFileChange,
    handleDrop,
    handleRotate,
    handleCenterH,
    handleCenterV,
    handleScaleChange,
    handleSubmit,
    setIsOpen,
  }
}
