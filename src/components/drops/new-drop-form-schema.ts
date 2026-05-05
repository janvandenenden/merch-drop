import { z } from "zod"
import type { Placement } from "@/lib/design-constants"

export type Phase = "idle" | "uploading" | "generating" | "ready" | "creating"

export type DesignPreview = {
  url: string
  naturalW: number
  naturalH: number
}

export type MockupState = {
  designFileKey: string
  printFileKey: string
  mockupKey: string
  mockupUrl: string
  placement: Placement
}

export const newDropFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  supportEmail: z.string().email("Enter a valid email address"),
  salePriceDollars: z.number().min(0.01, "Must be greater than 0"),
})

export type NewDropFormValues = z.infer<typeof newDropFormSchema>

export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
