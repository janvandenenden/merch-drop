"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Suspense } from "react";
import { authClient } from "@/lib/auth-client";
import { PAGE_MIN_HEIGHT_CLASS } from "@/lib/layout";
import { Button } from "@/components/ui/button";

const verifySchema = z.object({
  otp: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Digits only"),
});

type VerifyForm = z.infer<typeof verifySchema>;

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const slug = params.get("slug") ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });

  async function onSubmit(values: VerifyForm) {
    const { data, error } = await authClient.signIn.emailOtp({
      email,
      otp: values.otp,
    });

    if (error || !data) {
      setError("root", { message: error?.message ?? "Invalid code" });
      return;
    }

    // New signup: persist the chosen slug
    if (slug) {
      await authClient.updateUser({ slug });
    }

    router.push("/dashboard");
    router.refresh?.();
  }

  async function resend() {
    await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
  }

  return (
    <main className={`${PAGE_MIN_HEIGHT_CLASS} flex items-center justify-center p-4`}>
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to <strong>{email}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="otp" className="text-sm font-medium">
              Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-widest placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="123456"
              {...register("otp")}
            />
            {errors.otp && (
              <p className="text-xs text-destructive">{errors.otp.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-xs text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={resend}
            className="underline underline-offset-4"
          >
            Resend code
          </button>
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
