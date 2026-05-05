"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NewDropFormValues } from "@/components/drops/new-drop-form-schema";

const CLEAN_PRICE_POINTS = [25, 30, 35, 40, 45];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DropPricingSection({
  actualSalePriceCents,
  baseShirtCostCents,
  platformAndProcessing,
  creatorNet,
  onCustomize,
}: {
  actualSalePriceCents: number;
  baseShirtCostCents: number;
  platformAndProcessing: number;
  creatorNet: number;
  onCustomize: () => void;
}) {
  const {
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<NewDropFormValues>();

  const salePriceDollars = watch("salePriceDollars");

  return (
    <div className="space-y-5 border-t pt-6">
      <div className="space-y-3">
        <Label htmlFor="salePriceDollars">Final price</Label>
        <div className="flex flex-wrap items-center gap-2">
          {CLEAN_PRICE_POINTS.map((price) => (
            <Button
              key={price}
              type="button"
              variant={salePriceDollars === price ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setValue("salePriceDollars", price, { shouldValidate: true })
              }
            >
              ${price}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={onCustomize}>
            Customize
          </Button>
        </div>
        {errors.salePriceDollars && (
          <p className="text-sm text-destructive">
            {errors.salePriceDollars.message}
          </p>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Buyer pays</span>
          <span className="font-medium">
            {formatCents(actualSalePriceCents)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base shirt cost</span>
          <span>{formatCents(baseShirtCostCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform and processing</span>
          <span>{formatCents(platformAndProcessing)}</span>
        </div>
        <div className="flex justify-between border-t pt-3">
          <span className="text-muted-foreground">You earn</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCents(creatorNet)}
          </span>
        </div>
      </div>
    </div>
  );
}
