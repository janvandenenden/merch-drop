"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  closeDropAction,
  deleteDropAction,
  goLiveDropAction,
  pauseDropAction,
} from "@/app/dashboard/actions"
import type { Drop } from "@/lib/drops"

const STATUS_LABELS: Record<Drop["status"], string> = {
  pre_live: "Pre-live",
  live: "Live",
  paused: "Paused",
  closed: "Closed",
}

const STATUS_CLASSES: Record<Drop["status"], string> = {
  pre_live:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  live: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  paused:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  closed: "bg-muted text-muted-foreground",
}

export function DropStatusBadge({ status }: { status: Drop["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function DropStatusDialog({
  drop,
  chargesEnabled,
}: {
  drop: Drop
  chargesEnabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
      setOpen(false)
      setIsConfirmingDelete(false)
    })
  }

  const canGoLive =
    (drop.status === "pre_live" && chargesEnabled) || drop.status === "paused"
  const canPause = drop.status === "live"
  const canClose = drop.status === "live" || drop.status === "paused"
  const canDelete = drop.status === "closed"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setIsConfirmingDelete(false)
      }}
    >
      <div className="flex items-center gap-1.5">
        <DropStatusBadge status={drop.status} />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setOpen(true)}
          aria-label={`Edit status for ${drop.title}`}
        >
          <Pencil />
        </Button>
      </div>
      <DialogContent>
        {isConfirmingDelete ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete "{drop.title}"?</DialogTitle>
              <DialogDescription>
                This cannot be undone. The drop and all its settings will be
                permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => runAction(() => deleteDropAction(drop.id))}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Status for "{drop.title}"</DialogTitle>
              <DialogDescription>
                Change whether this drop is purchasable, paused, or closed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Live</p>
                  <p className="text-xs text-muted-foreground">
                    Buyers can view the page and place orders.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => runAction(() => goLiveDropAction(drop.id))}
                  disabled={!canGoLive || isPending}
                >
                  Set live
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Paused</p>
                  <p className="text-xs text-muted-foreground">
                    Keep the page visible, but stop checkout.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runAction(() => pauseDropAction(drop.id))}
                  disabled={!canPause || isPending}
                >
                  Pause
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Closed</p>
                  <p className="text-xs text-muted-foreground">
                    End the drop. Closed drops cannot be reopened.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => runAction(() => closeDropAction(drop.id))}
                  disabled={!canClose || isPending}
                >
                  Close
                </Button>
              </div>

              {canDelete && (
                <div className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 p-3">
                  <div>
                    <p className="text-sm font-medium">Delete</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently remove this closed drop.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
