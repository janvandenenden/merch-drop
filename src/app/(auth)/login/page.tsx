"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: values.email,
      type: "sign-in",
    });

    if (error) {
      setError("root", { message: error.message ?? "Failed to send code" });
      return;
    }

    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send a code to your email.
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

        {errors.root && (
          <p className="text-xs text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending code…" : "Send code"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="underline underline-offset-4">
          Sign up
        </a>
      </p>
    </div>
  );
}
