import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDrop } from "@/lib/drops"
import { DesignStep } from "@/components/drops/design-step"

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const drop = await getDrop(id)
  if (!drop || drop.userId !== session.user.id) notFound()

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Design your drop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your design and preview how it looks on the shirt.
          </p>
        </div>
        <DesignStep
          dropId={id}
          initialMockupUrl={drop.mockupUrl ?? undefined}
          locked={!!drop.firstSaleAt}
        />
      </div>
    </main>
  )
}
