"use client";

import type * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = React.ComponentProps<typeof Button>;
type SignOutClickEvent = Parameters<
  NonNullable<SignOutButtonProps["onClick"]>
>[0];

export function SignOutButton({ onClick, ...props }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut(event: SignOutClickEvent) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    await authClient.signOut();
    router.push("/login");
    router.refresh?.();
  }

  return (
    <Button {...props} variant={props.variant ?? "outline"} onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
