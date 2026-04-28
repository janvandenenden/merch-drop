"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { updateDrop, deleteDrop } from "@/lib/drops"

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return session
}

export async function closeDropAction(dropId: string) {
  const { user } = await requireSession()
  await updateDrop(dropId, { status: "closed" })
  revalidatePath("/dashboard")
}

export async function deleteDropAction(dropId: string) {
  const { user } = await requireSession()
  await deleteDrop(dropId, user.id)
  revalidatePath("/dashboard")
}
