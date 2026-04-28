import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.slug, slug))
    .limit(1);

  return Response.json({ available: existing.length === 0 });
}
