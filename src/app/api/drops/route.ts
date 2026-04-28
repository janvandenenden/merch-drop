import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { createDrop } from "@/lib/drops"

const bodySchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  supportEmail: z.string().email(),
  markupCents: z.number().int().min(0),
})

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const drop = await createDrop({ userId: session.user.id, ...parsed.data })
    return NextResponse.json({ id: drop.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create drop"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
