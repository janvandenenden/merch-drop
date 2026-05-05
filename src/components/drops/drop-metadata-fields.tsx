"use client";

import { useFormContext } from "react-hook-form";
import { Globe, Mail, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { NewDropFormValues } from "@/components/drops/new-drop-form-schema";

export function DropMetadataFields({
  creatorSlug,
  onEditSlug,
  onEditSupportEmail,
}: {
  creatorSlug: string;
  onEditSlug: () => void;
  onEditSupportEmail: () => void;
}) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<NewDropFormValues>();

  const slug = watch("slug");
  const supportEmail = watch("supportEmail");

  return (
    <div className="space-y-5">
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
        <Label htmlFor="description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          rows={4}
          placeholder="Tell buyers about this drop..."
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4" />
          <span className="min-w-0 flex-1 truncate">
            {supportEmail || "Add a support email"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit support email"
            onClick={onEditSupportEmail}
          >
            <Pencil />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="size-4" />
          <span className="min-w-0 flex-1 truncate font-mono">
            merch-drop.com/{creatorSlug}/{slug || "your-drop"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit URL slug"
            onClick={onEditSlug}
          >
            <Pencil />
          </Button>
        </div>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
        {errors.supportEmail && (
          <p className="text-sm text-destructive">
            {errors.supportEmail.message}
          </p>
        )}
      </div>
    </div>
  );
}
