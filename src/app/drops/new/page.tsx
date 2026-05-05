import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { APP_CONTENT_CLASS, PAGE_MIN_HEIGHT_CLASS } from "@/lib/layout"
import { NewDropForm } from "@/components/drops/new-drop-form"

export default async function NewDropPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  return (
    <main className={`${PAGE_MIN_HEIGHT_CLASS} py-8`}>
      <div className={`${APP_CONTENT_CLASS} space-y-8`}>
        <div>
          <h1 className="text-2xl font-semibold">Create your drop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the details, price, and shirt design in one flow.
          </p>
        </div>
        <NewDropForm
          creatorSlug={session.user.slug ?? ""}
          userEmail={session.user.email}
        />
      </div>
    </main>
  )
}
