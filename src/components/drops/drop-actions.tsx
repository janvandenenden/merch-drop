"use client"

import { useState, useTransition } from "react"
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
import { goLiveDropAction, pauseDropAction, closeDropAction, deleteDropAction } from "@/app/dashboard/actions"
import type { Drop } from "@/lib/drops"

export function DropActions({ drop, chargesEnabled }: { drop: Drop; chargesEnabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteDropAction(drop.id)
      setOpen(false)
    })
  }

  function handleGoLive() {
    startTransition(() => goLiveDropAction(drop.id))
  }

  function handlePause() {
    startTransition(() => pauseDropAction(drop.id))
  }

  function handleClose() {
    startTransition(() => closeDropAction(drop.id))
  }

  return (
    <>
      {drop.status === "pre_live" && chargesEnabled && (
        <Button size="sm" onClick={handleGoLive} disabled={isPending}>
          Go Live
        </Button>
      )}

      {drop.status === "live" && (
        <Button variant="outline" size="sm" onClick={handlePause} disabled={isPending}>
          Pause
        </Button>
      )}

      {drop.status === "paused" && (
        <Button size="sm" onClick={handleGoLive} disabled={isPending}>
          Resume
        </Button>
      )}

      {(drop.status === "live" || drop.status === "paused") && (
        <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
          Close
        </Button>
      )}

      {drop.status === "closed" && (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)} disabled={isPending}>
          Delete
        </Button>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete "{drop.title}"?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The drop and all its settings will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </>
  )
}
