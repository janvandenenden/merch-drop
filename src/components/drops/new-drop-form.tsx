"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { DropMetadataFields } from "@/components/drops/drop-metadata-fields";
import { DropPricingSection } from "@/components/drops/drop-pricing-section";
import {
  DesignPhasePanel,
  useDesignPhase,
} from "@/components/drops/design-phase-panel";
import {
  SlugDialog,
  SupportEmailDialog,
  CustomPriceDialog,
} from "@/components/drops/drop-form-dialogs";
import {
  newDropFormSchema,
  toSlug,
  type NewDropFormValues,
} from "@/components/drops/new-drop-form-schema";
import {
  BASE_SHIRT_COST_CENTS,
  computeApplicationFee,
  fixedProductPrice,
  salePriceToMarkupCents,
} from "@/lib/pricing";

export function NewDropForm({
  creatorSlug,
  userEmail,
}: {
  creatorSlug: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugDialogOpen, setSlugDialogOpen] = useState(false);
  const [supportEmailDialogOpen, setSupportEmailDialogOpen] = useState(false);
  const [customPriceDialogOpen, setCustomPriceDialogOpen] = useState(false);

  const designPhase = useDesignPhase();

  const form = useForm<NewDropFormValues>({
    resolver: zodResolver(newDropFormSchema),
    mode: "onChange",
    defaultValues: {
      salePriceDollars: 35,
      slug: "",
      title: "",
      supportEmail: userEmail ?? "",
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { isValid },
  } = form;
  const title = watch("title");
  const salePriceDollars = watch("salePriceDollars");

  useEffect(() => {
    if (!slugEdited && title) {
      const nextSlug = toSlug(title);
      if (nextSlug) setValue("slug", nextSlug, { shouldValidate: true });
    }
  }, [title, slugEdited, setValue]);

  // Pricing
  const finalPriceCents = Math.round((salePriceDollars || 0) * 100);
  const markupCents = salePriceToMarkupCents(finalPriceCents);
  const actualSalePriceCents = fixedProductPrice(markupCents);
  const { applicationFee, serviceFee, creatorNet } = computeApplicationFee(
    actualSalePriceCents,
    BASE_SHIRT_COST_CENTS,
    0,
  );
  const processingFee = Math.max(
    0,
    applicationFee - BASE_SHIRT_COST_CENTS - serviceFee,
  );
  const platformAndProcessing = serviceFee + processingFee;

  const canCreate =
    isValid &&
    designPhase.phase === "ready" &&
    designPhase.rightsAccepted &&
    !designPhase.isBusy;

  async function onSubmit(values: NewDropFormValues) {
    if (!designPhase.mockup) return;

    designPhase.setServerError(null);
    designPhase.setPhase("creating");

    try {
      const res = await fetch("/api/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          slug: values.slug,
          description: values.description,
          supportEmail: values.supportEmail,
          markupCents,
          designFileKey: designPhase.mockup.designFileKey,
          printFileKey: designPhase.mockup.printFileKey,
          mockupKey: designPhase.mockup.mockupKey,
          placement: designPhase.mockup.placement,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong");
      }

      router.push("/dashboard");
    } catch (err) {
      designPhase.setServerError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      designPhase.setPhase("ready");
    }
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]"
      >
        <div className="space-y-8">
          <DropMetadataFields
            creatorSlug={creatorSlug}
            onEditSlug={() => setSlugDialogOpen(true)}
            onEditSupportEmail={() => setSupportEmailDialogOpen(true)}
          />
          <DropPricingSection
            actualSalePriceCents={actualSalePriceCents}
            baseShirtCostCents={BASE_SHIRT_COST_CENTS}
            platformAndProcessing={platformAndProcessing}
            creatorNet={creatorNet}
            onCustomize={() => setCustomPriceDialogOpen(true)}
          />
        </div>

        <DesignPhasePanel designPhase={designPhase} canCreate={canCreate} />

        <SlugDialog
          open={slugDialogOpen}
          onOpenChange={setSlugDialogOpen}
          onSave={async () => {
            const valid = await trigger("slug");
            if (valid) setSlugDialogOpen(false);
          }}
          onSlugEdit={() => setSlugEdited(true)}
        />
        <SupportEmailDialog
          open={supportEmailDialogOpen}
          onOpenChange={setSupportEmailDialogOpen}
          onSave={async () => {
            const valid = await trigger("supportEmail");
            if (valid) setSupportEmailDialogOpen(false);
          }}
        />
        <CustomPriceDialog
          open={customPriceDialogOpen}
          onOpenChange={setCustomPriceDialogOpen}
          onSave={async () => {
            const valid = await trigger("salePriceDollars");
            if (valid) setCustomPriceDialogOpen(false);
          }}
        />
      </form>
    </FormProvider>
  );
}
