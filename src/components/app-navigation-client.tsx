"use client"

import Link from "next/link"
import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { APP_CONTENT_CLASS, APP_NAV_HEIGHT_CLASS } from "@/lib/layout"
import { MobileNavigation } from "@/components/mobile-navigation"
import { SignOutButton } from "@/components/sign-out-button"
import { Button } from "@/components/ui/button"

type AppNavigationClientProps = {
  initialIsAuthenticated: boolean
}

export function AppNavigationClient({
  initialIsAuthenticated,
}: AppNavigationClientProps) {
  const pathname = usePathname()
  const session = authClient.useSession()
  const isAuthenticated = session.isPending
    ? initialIsAuthenticated
    : Boolean(session.data)

  useEffect(() => {
    void session.refetch()
  }, [pathname])

  return (
    <header className="border-b bg-background">
      <div className={`${APP_CONTENT_CLASS} ${APP_NAV_HEIGHT_CLASS} flex items-center justify-between`}>
        <Link href="/" className="text-sm font-semibold">
          Merch Drop
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Button
                nativeButton={false}
                render={<Link href="/dashboard" />}
                size="sm"
              >
                Dashboard
              </Button>
              <SignOutButton size="sm" />
            </>
          ) : (
            <Button
              nativeButton={false}
              render={<Link href="/login" />}
              size="sm"
            >
              Login
            </Button>
          )}
        </nav>
        <MobileNavigation isAuthenticated={isAuthenticated} />
      </div>
    </header>
  )
}
