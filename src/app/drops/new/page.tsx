import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { NewDropForm } from "@/components/drops/new-drop-form"

export default async function NewDropPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Create a drop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your merch drop details.
          </p>
        </div>
        <NewDropForm creatorSlug={session.user.slug ?? ""} />
      </div>
    </main>
  )
}
