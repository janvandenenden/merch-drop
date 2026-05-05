import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
const mockHeaders = vi.fn();
const mockListDrops = vi.fn();
const mockGetDropStatsForCreator = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/lib/drops", () => ({
  listDrops: mockListDrops,
}));

vi.mock("@/lib/orders", () => ({
  getDropStatsForCreator: mockGetDropStatsForCreator,
}));

vi.mock("@/lib/storage", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@/components/drops/drop-actions", () => ({
  DropStatusDialog: ({ drop }: { drop: { status: string } }) => (
    <div>status:{drop.status}</div>
  ),
}));

vi.mock("@/components/drops/public-link-actions", () => ({
  PublicLinkActions: ({ href }: { href: string }) => <div>share:{href}</div>,
}));

vi.mock("@/components/drops/dashboard-drop-primary-action", () => ({
  DashboardDropPrimaryAction: ({
    status,
    chargesEnabled,
  }: {
    status: string;
    chargesEnabled: boolean;
  }) => <div>{`primary:${status}:${String(chargesEnabled)}`}</div>,
}));

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Jan",
    email: "jan@example.com",
    slug: "jan",
    chargesEnabled: true,
    ...overrides,
  };
}

function makeDrop(overrides: Record<string, unknown> = {}) {
  return {
    id: "drop-1",
    userId: "user-1",
    slug: "summer-drop",
    title: "Summer Drop",
    description: null,
    supportEmail: "support@example.com",
    markupCents: 500,
    shirtColor: "white",
    status: "ready",
    designFileKey: null,
    printFileKey: null,
    mockupKey: null,
    mockupUrl: null,
    placement: null,
    firstSaleAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHeaders.mockResolvedValue(new Headers());
  mockGetSession.mockResolvedValue({ user: makeUser() });
  mockGetDropStatsForCreator.mockResolvedValue([]);
  mockGetSignedUrl.mockResolvedValue("https://example.com/mockup.png");
});

afterEach(cleanup);

describe("DashboardPage", () => {
  it("passes ready and live drops to the primary action slot", async () => {
    mockListDrops.mockResolvedValue([
      makeDrop({ id: "drop-ready", status: "ready", title: "Ready Drop" }),
      makeDrop({ id: "drop-live", status: "live", title: "Live Drop" }),
    ]);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const page = await DashboardPage({
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getAllByText("primary:ready:true")).toHaveLength(2);
    expect(screen.getAllByText("primary:live:true")).toHaveLength(2);
  });

  it("passes paused and closed drops through without regressing the action slot", async () => {
    mockListDrops.mockResolvedValue([
      makeDrop({ id: "drop-paused", status: "paused", title: "Paused Drop" }),
      makeDrop({ id: "drop-closed", status: "closed", title: "Closed Drop" }),
    ]);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const page = await DashboardPage({
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getAllByText("primary:paused:true")).toHaveLength(2);
    expect(screen.getAllByText("primary:closed:true")).toHaveLength(2);
  });

  it("passes chargesEnabled=false to ready drop actions", async () => {
    mockGetSession.mockResolvedValue({
      user: makeUser({ chargesEnabled: false }),
    });
    mockListDrops.mockResolvedValue([makeDrop({ status: "ready" })]);

    const { default: DashboardPage } = await import("@/app/dashboard/page");
    const page = await DashboardPage({
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getAllByText("primary:ready:false")).toHaveLength(2);
  });
});
