"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NewDropFormValues } from "@/components/drops/new-drop-form-schema";

export function SlugDialog({
  open,
  onOpenChange,
  onSave,
  onSlugEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onSlugEdit: () => void;
}) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<NewDropFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit URL slug</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug</Label>
          <Input
            id="slug"
            {...register("slug")}
            className="font-mono"
            placeholder="summer-drop-2026"
            onChange={(e) => {
              onSlugEdit();
              setValue("slug", e.target.value, { shouldValidate: true });
            }}
          />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupportEmailDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewDropFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit support email</DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomPriceDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext<NewDropFormValues>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize final price</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="salePriceDollarsCustom">Final price</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Controller
              name="salePriceDollars"
              control={control}
              render={({ field }) => (
                <Input
                  id="salePriceDollarsCustom"
                  type="number"
                  min={0.01}
                  step={0.01}
                  className="w-40"
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) || 0)
                  }
                />
              )}
            />
          </div>
          {errors.salePriceDollars && (
            <p className="text-sm text-destructive">
              {errors.salePriceDollars.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
