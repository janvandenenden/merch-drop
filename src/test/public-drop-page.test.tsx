import type { ImgHTMLAttributes } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetDropBySlug = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockFixedProductPrice = vi.fn();

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/drops", () => ({
  getDropBySlug: mockGetDropBySlug,
}));

vi.mock("@/lib/storage", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@/lib/pricing", () => ({
  fixedProductPrice: mockFixedProductPrice,
}));

function makeCreator(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    slug: "jan",
    ...overrides,
  };
}

function makeDrop(overrides: Record<string, unknown> = {}) {
  return {
    id: "drop-1",
    userId: "user-1",
    slug: "summer-drop",
    title: "Summer Drop",
    description: "Soft tee with a preview-worthy layout.",
    supportEmail: "support@example.com",
    markupCents: 500,
    shirtColor: "white",
    status: "ready",
    mockupKey: "mockups/drop-1.png",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function renderPage(status: "ready" | "live" | "paused" | "closed") {
  const creator = makeCreator();
  const drop = makeDrop({ status });
  mockGetDropBySlug.mockResolvedValue({ creator, drop });
  mockGetSignedUrl.mockResolvedValue("https://example.com/mockup.png");
  mockFixedProductPrice.mockReturnValue(2800);

  const { default: PublicDropPage } =
    await import("@/app/[creatorSlug]/[dropSlug]/page");
  const page = await PublicDropPage({
    params: Promise.resolve({ creatorSlug: creator.slug, dropSlug: drop.slug }),
  });

  render(page);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("PublicDropPage", () => {
  it("renders ready drops as the full product page with a disabled Coming soon CTA", async () => {
    await renderPage("ready");

    expect(
      screen.getByRole("heading", { name: "Summer Drop" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Soft tee with a preview-worthy layout."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Summer Drop" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coming soon/i })).toBeDisabled();
    expect(screen.getByText(/preview only/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "support@example.com" }),
    ).toHaveAttribute("href", "mailto:support@example.com");
  });

  it("renders live drops with the active buy flow", async () => {
    await renderPage("live");

    expect(
      screen.getByRole("button", { name: /calculate shipping/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /coming soon/i }),
    ).not.toBeInTheDocument();
  });

  it("renders paused drops with a disabled Sale paused CTA", async () => {
    await renderPage("paused");

    expect(screen.getByRole("button", { name: /sale paused/i })).toBeDisabled();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("renders closed drops with a disabled Sale ended CTA", async () => {
    await renderPage("closed");

    expect(screen.getByRole("button", { name: /sale ended/i })).toBeDisabled();
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });
});
