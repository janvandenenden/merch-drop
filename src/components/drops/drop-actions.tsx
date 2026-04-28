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
import { closeDropAction, deleteDropAction } from "@/app/dashboard/actions"
import type { Drop } from "@/lib/drops"

export function DropActions({ drop }: { drop: Drop }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteDropAction(drop.id)
      setOpen(false)
    })
  }

  function handleClose() {
    startTransition(() => closeDropAction(drop.id))
  }

  return (
    <>
      {drop.status === "live" && (
        <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
          Close
        </Button>
      )}

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
    </>
  )
}
