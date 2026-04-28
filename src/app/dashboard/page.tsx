import Link from "next/link"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { listDrops } from "@/lib/drops"
import { SignOutButton } from "@/components/sign-out-button"
import { CopyButton } from "@/components/drops/copy-button"
import { DropActions } from "@/components/drops/drop-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import type { Drop } from "@/lib/drops"

const STATUS_LABELS: Record<Drop["status"], string> = {
  pre_live: "Pre-live",
  live: "Live",
  closed: "Closed",
}

const STATUS_CLASSES: Record<Drop["status"], string> = {
  pre_live: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  live: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
}

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://merch-drop.com"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { user } = session
  const drops = await listDrops(user.id)
  const needsStripe = !user.chargesEnabled

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Your drops</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.name || user.email}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button nativeButton={false} render={<Link href="/drops/new" />}>New drop</Button>
            <SignOutButton />
          </div>
        </div>

        {drops.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
              <p className="text-muted-foreground">No drops yet.</p>
              <Button nativeButton={false} render={<Link href="/drops/new" />}>Create your first drop</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {drops.map((drop) => {
              const shareUrl = `${BASE_URL}/${user.slug}/${drop.slug}`
              const showEnableCheckout =
                drop.status === "pre_live" && needsStripe

              return (
                <Card key={drop.id}>
                  <CardHeader>
                    <CardTitle>{drop.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {shareUrl}
                    </CardDescription>
                    <CardAction>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[drop.status]}`}
                      >
                        {STATUS_LABELS[drop.status]}
                      </span>
                    </CardAction>
                  </CardHeader>

                  <CardContent className="flex flex-wrap items-center gap-2">
                    <CopyButton text={shareUrl} />
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/drops/${drop.id}/edit`} />}>Edit</Button>
                    <DropActions drop={drop} />
                  </CardContent>

                  {showEnableCheckout && (
                    <CardFooter className="gap-3">
                      <p className="text-sm text-muted-foreground flex-1">
                        Connect Stripe to accept payments for this drop.
                      </p>
                      <Button size="sm" nativeButton={false} render={<Link href="/api/stripe/connect" />}>Enable checkout</Button>
                    </CardFooter>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
