"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const signupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  slug: z
    .string()
    .min(3, "Min 3 characters")
    .max(60, "Max 60 characters")
    .regex(slugRegex, "Only lowercase letters, numbers, hyphens. No leading/trailing hyphens."),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupForm) {
    const res = await fetch(
      `/api/slug-available?slug=${encodeURIComponent(values.slug)}`
    );
    const { available } = await res.json();
    if (!available) {
      setError("slug", { message: "Username already taken" });
      return;
    }

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: values.email,
      type: "sign-in",
    });

    if (error) {
      setError("root", { message: error.message ?? "Failed to send code" });
      return;
    }

    router.push(
      `/verify?email=${encodeURIComponent(values.email)}&slug=${encodeURIComponent(values.slug)}`
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Create your store</h1>
          <p className="text-sm text-muted-foreground">
            Choose a username for your merch page.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="slug" className="text-sm font-medium">
              Username
            </label>
            <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
              <span className="text-muted-foreground select-none">merch-drop.com/</span>
              <input
                id="slug"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                className="flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none"
                placeholder="your-name"
                {...register("slug")}
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-xs text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending code…" : "Continue"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
