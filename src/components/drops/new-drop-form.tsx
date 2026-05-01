"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { fixedProductPrice, salePriceToMarkupCents, computeApplicationFee, BASE_SHIRT_COST_CENTS } from "@/lib/pricing"

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  supportEmail: z.string().email("Enter a valid email address"),
  salePriceDollars: z.number().min(0.01, "Must be greater than 0"),
})

type FormValues = z.infer<typeof schema>

export function NewDropForm({ creatorSlug }: { creatorSlug: string }) {
  const router = useRouter()
  const [slugEdited, setSlugEdited] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { salePriceDollars: 35, slug: "", title: "" },
  })

  const title = watch("title")
  const salePriceDollars = watch("salePriceDollars")

  useEffect(() => {
    if (!slugEdited && title) {
      const slug = toSlug(title)
      if (slug) setValue("slug", slug, { shouldValidate: false })
    }
  }, [title, slugEdited, setValue])

  const salePriceCents = Math.round((salePriceDollars || 0) * 100)
  const markupCents = salePriceToMarkupCents(salePriceCents)
  const actualSalePriceCents = fixedProductPrice(markupCents)
  const { creatorNet } = computeApplicationFee(actualSalePriceCents, BASE_SHIRT_COST_CENTS, 0)

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const res = await fetch("/api/drops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        slug: values.slug,
        description: values.description,
        supportEmail: values.supportEmail,
        markupCents: salePriceToMarkupCents(Math.round(values.salePriceDollars * 100)),
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setServerError(body.error ?? "Something went wrong")
      return
    }

    const { id } = await res.json()
    router.push(`/drops/${id}/design`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="Summer Drop 2026"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-sm text-muted-foreground">
            merch-drop.com/{creatorSlug}/
          </span>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <Input
                id="slug"
                {...field}
                onChange={(e) => {
                  setSlugEdited(true)
                  field.onChange(e.target.value)
                }}
                placeholder="summer-drop-2026"
                className="font-mono"
              />
            )}
          />
        </div>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={3}
          placeholder="Tell buyers about this drop..."
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportEmail">Support email</Label>
        <Input
          id="supportEmail"
          type="email"
          {...register("supportEmail")}
          placeholder="support@yourstore.com"
        />
        {errors.supportEmail && (
          <p className="text-sm text-destructive">
            {errors.supportEmail.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="salePriceDollars">Sale price</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Controller
            name="salePriceDollars"
            control={control}
            render={({ field }) => (
              <Input
                id="salePriceDollars"
                type="number"
                min={0.01}
                step={0.01}
                className="w-32"
                value={field.value}
                onChange={(e) =>
                  field.onChange(parseFloat(e.target.value) || 0)
                }
              />
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">What the buyer pays for the shirt, before shipping.</p>
        {errors.salePriceDollars && (
          <p className="text-sm text-destructive">
            {errors.salePriceDollars.message}
          </p>
        )}
      </div>

      <Card>
        <CardContent className="flex items-center justify-between pt-6 text-sm">
          <div>
            <p className="text-muted-foreground">Sale price</p>
            <p className="text-lg font-semibold">${formatCents(actualSalePriceCents)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">You earn per shirt</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">~${formatCents(creatorNet)}</p>
          </div>
        </CardContent>
      </Card>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating..." : "Create drop"}
      </Button>
    </form>
  )
}
