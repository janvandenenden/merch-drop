import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGoLiveDropAction = vi.fn();

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

vi.mock("@/app/dashboard/actions", () => ({
  goLiveDropAction: mockGoLiveDropAction,
}));

describe("DashboardDropPrimaryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("shows a Go live button for ready drops", async () => {
    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="ready"
        chargesEnabled
      />,
    );

    expect(screen.getByRole("button", { name: /go live/i })).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: /orders/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an Unpause button for paused drops", async () => {
    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="paused"
        chargesEnabled
      />,
    );

    expect(screen.getByRole("button", { name: /unpause/i })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /^Go live$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an Orders link for live drops", async () => {
    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="live"
        chargesEnabled
        orderCount={3}
      />,
    );

    expect(screen.getByRole("button", { name: "Orders (3)" })).toHaveAttribute(
      "href",
      "/dashboard/orders?drop=drop-1",
    );
    expect(
      screen.queryByRole("button", { name: /^Go live$/i }),
    ).not.toBeInTheDocument();
  });

  it("renders no primary action for closed drops", async () => {
    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="closed"
        chargesEnabled
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("calls goLiveDropAction with the drop id", async () => {
    mockGoLiveDropAction.mockResolvedValue(undefined);

    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="ready"
        chargesEnabled
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(mockGoLiveDropAction).toHaveBeenCalledWith("drop-1");
    });
  });

  it("calls goLiveDropAction with the drop id when unpausing", async () => {
    mockGoLiveDropAction.mockResolvedValue(undefined);

    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="paused"
        chargesEnabled
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /unpause/i }));

    await waitFor(() => {
      expect(mockGoLiveDropAction).toHaveBeenCalledWith("drop-1");
    });
  });

  it("shows a pending state while going live", async () => {
    let resolveAction: (() => void) | undefined;
    mockGoLiveDropAction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="ready"
        chargesEnabled
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /go live/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /going live/i }),
      ).toBeDisabled();
    });

    resolveAction?.();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go live/i })).toBeEnabled();
    });
  });

  it("shows a pending state while unpausing", async () => {
    let resolveAction: (() => void) | undefined;
    mockGoLiveDropAction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="paused"
        chargesEnabled
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /unpause/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /unpausing/i })).toBeDisabled();
    });

    resolveAction?.();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /unpause/i })).toBeEnabled();
    });
  });

  it("disables Go live when Stripe checkout is not enabled", async () => {
    const { DashboardDropPrimaryAction } =
      await import("@/components/drops/dashboard-drop-primary-action");

    render(
      <DashboardDropPrimaryAction
        dropId="drop-1"
        status="ready"
        chargesEnabled={false}
      />,
    );

    expect(screen.getByRole("button", { name: /go live/i })).toBeDisabled();
    expect(mockGoLiveDropAction).not.toHaveBeenCalled();
  });
});
