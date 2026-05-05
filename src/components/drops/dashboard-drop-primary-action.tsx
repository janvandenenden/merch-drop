"use client";

import Link from "next/link";
import { useTransition } from "react";
import { goLiveDropAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import type { Drop } from "@/lib/drops";

type DashboardDropPrimaryActionProps = {
  dropId: string;
  status: Drop["status"];
  chargesEnabled: boolean;
  orderCount?: number;
};

export function DashboardDropPrimaryAction({
  dropId,
  status,
  chargesEnabled,
  orderCount = 0,
}: DashboardDropPrimaryActionProps) {
  const [isPending, startTransition] = useTransition();

  async function goLive() {
    await goLiveDropAction(dropId);
  }

  if (status === "live") {
    return (
      <Button
        variant="default"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/orders?drop=${dropId}`} />}
      >
        Orders
        {orderCount > 0 ? ` (${orderCount})` : ""}
      </Button>
    );
  }

  if (status === "ready") {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() =>
          startTransition(async () => {
            await goLive();
          })
        }
        disabled={!chargesEnabled || isPending}
      >
        {isPending ? "Going live..." : "Go live"}
      </Button>
    );
  }

  if (status === "paused") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          startTransition(async () => {
            await goLive();
          })
        }
        disabled={isPending}
      >
        {isPending ? "Unpausing..." : "Unpause"}
      </Button>
    );
  }

  return null;
}
