const MAX_SLUG_LENGTH = 60;

export function generateSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}

export async function ensureUniqueSlug(
  userId: string,
  baseSlug: string,
  db: {
    findFirst: (args: {
      where: { userId: string; slug: string };
    }) => Promise<unknown>;
  }
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (await db.findFirst({ where: { userId, slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return candidate;
}
