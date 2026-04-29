import { redirect, notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getDrop } from "@/lib/drops"
import { DesignEditorStep } from "@/components/drops/design-editor-step"

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { id } = await params
  const drop = await getDrop(id)
  if (!drop) notFound()
  if (drop.userId !== session.user.id) notFound()

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Upload your design</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Place your PNG design on the shirt, then save.
          </p>
        </div>
        <DesignEditorStep dropId={id} locked={drop.firstSaleAt !== null} />
      </div>
    </main>
  )
}
