import { describe, expect, it, vi } from "vitest";
import { ensureUniqueSlug, generateSlug } from "../lib/slugs";

describe("generateSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("strips special chars", () => {
    expect(generateSlug("Drop! #1 @ Summer")).toBe("drop-1-summer");
  });

  it("handles unicode accents", () => {
    expect(generateSlug("Été Spécial")).toBe("ete-special");
  });

  it("collapses multiple spaces/hyphens", () => {
    expect(generateSlug("hello   ---   world")).toBe("hello-world");
  });

  it("truncates long strings", () => {
    const long = "a".repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(60);
  });

  it("no trailing hyphens after truncation", () => {
    const slug = generateSlug("a".repeat(59) + " extra");
    expect(slug).not.toMatch(/-$/);
  });

  it("empty string returns empty", () => {
    expect(generateSlug("")).toBe("");
  });

  it("all special chars returns empty", () => {
    expect(generateSlug("!!!###")).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns baseSlug if no collision", async () => {
    const db = { findFirst: vi.fn().mockResolvedValue(null) };
    const result = await ensureUniqueSlug("user1", "my-drop", db);
    expect(result).toBe("my-drop");
  });

  it("appends -1 on first collision", async () => {
    const db = {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce({ id: "x" })
        .mockResolvedValue(null),
    };
    const result = await ensureUniqueSlug("user1", "my-drop", db);
    expect(result).toBe("my-drop-1");
  });

  it("increments until unique", async () => {
    const db = {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce({ id: "x" })
        .mockResolvedValueOnce({ id: "y" })
        .mockResolvedValueOnce({ id: "z" })
        .mockResolvedValue(null),
    };
    const result = await ensureUniqueSlug("user1", "my-drop", db);
    expect(result).toBe("my-drop-3");
  });

  it("scopes collision check to userId", async () => {
    const db = { findFirst: vi.fn().mockResolvedValue(null) };
    await ensureUniqueSlug("user-abc", "drop", db);
    expect(db.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-abc", slug: "drop" },
    });
  });
});
