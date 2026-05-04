"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { SignOutButton } from "@/components/sign-out-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type MobileNavigationProps = {
  isAuthenticated: boolean
}

export function MobileNavigation({ isAuthenticated }: MobileNavigationProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <MenuIcon />
      </DialogTrigger>
      <DialogContent
        className="top-0 right-0 left-auto h-dvh max-w-80 translate-x-0 translate-y-0 content-start rounded-none border-l p-6 sm:max-w-80"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Merch Drop</DialogTitle>
        </DialogHeader>
        <nav className="mt-6 flex flex-col gap-3">
          {isAuthenticated ? (
            <>
              <DialogClose
                nativeButton={false}
                render={
                  <Button
                    nativeButton={false}
                    render={<Link href="/dashboard" />}
                    className="w-full justify-start"
                  />
                }
              >
                Dashboard
              </DialogClose>
              <SignOutButton className="w-full justify-start" />
            </>
          ) : (
            <DialogClose
              nativeButton={false}
              render={
                <Button
                  nativeButton={false}
                  render={<Link href="/login" />}
                  className="w-full justify-start"
                />
              }
            >
              Login
            </DialogClose>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  )
}
