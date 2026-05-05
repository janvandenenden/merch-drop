import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { listDrops } from "@/lib/drops";
import { APP_CONTENT_CLASS, APP_PAGE_CLASS } from "@/lib/layout";
import { getDropStatsForCreator } from "@/lib/orders";
import { getSignedUrl } from "@/lib/storage";
import { DropStatusDialog } from "@/components/drops/drop-actions";
import { DashboardDropPrimaryAction } from "@/components/drops/dashboard-drop-primary-action";
import { PublicLinkActions } from "@/components/drops/public-link-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Drop } from "@/lib/drops";

type StatusFilter = "all" | "live" | "non-live";
type DashboardSearchParams = Promise<{ status?: string | string[] }>;
type DropImage = { url: string | null; label: string };

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://merch-drop.com";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  live: "Live",
  "non-live": "Non-live",
};

function parseStatusFilter(value: string | string[] | undefined): StatusFilter {
  const status = Array.isArray(value) ? value[0] : value;
  return status === "live" || status === "non-live" ? status : "all";
}

function filterDrops(drops: Drop[], statusFilter: StatusFilter): Drop[] {
  if (statusFilter === "live")
    return drops.filter((drop) => drop.status === "live");
  if (statusFilter === "non-live")
    return drops.filter((drop) => drop.status !== "live");
  return drops;
}

function filterHref(statusFilter: StatusFilter) {
  return statusFilter === "all"
    ? "/dashboard"
    : `/dashboard?status=${statusFilter}`;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function getSignedDropImage(
  key: string,
  label: string,
): Promise<DropImage | null> {
  try {
    return { url: await getSignedUrl(key), label };
  } catch {
    return null;
  }
}

async function getDropImage(drop: Drop): Promise<DropImage> {
  if (drop.mockupKey) {
    const mockup = await getSignedDropImage(drop.mockupKey, "Mockup");
    if (mockup) return mockup;
  }

  if (drop.mockupUrl) return { url: drop.mockupUrl, label: "Mockup" };

  if (drop.designFileKey) {
    const design = await getSignedDropImage(drop.designFileKey, "Design");
    if (design) return design;
    return { url: null, label: "Design unavailable" };
  }

  return { url: null, label: "No design" };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { user } = session;
  const statusFilter = parseStatusFilter((await searchParams).status);
  const [drops, dropStats] = await Promise.all([
    listDrops(user.id),
    getDropStatsForCreator(user.id),
  ]);
  const statsMap = new Map(dropStats.map((s) => [s.dropId, s]));
  const needsStripe = !user.chargesEnabled;

  const visibleDrops = filterDrops(drops, statusFilter);
  const imageEntries = await Promise.all(
    visibleDrops.map(
      async (drop) => [drop.id, await getDropImage(drop)] as const,
    ),
  );
  const imageMap = new Map(imageEntries);

  function renderDropRow(drop: Drop) {
    const shareUrl = `${BASE_URL}/${user.slug}/${drop.slug}`;
    const stats = statsMap.get(drop.id);
    const image = imageMap.get(drop.id) ?? { url: null, label: "No design" };

    return (
      <tr key={drop.id} className="border-b last:border-0">
        <td className="w-24 px-4 py-3 align-middle">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted text-[10px] font-medium text-muted-foreground">
            {image.url ? (
              <img
                src={image.url}
                alt={`${drop.title} ${image.label.toLowerCase()}`}
                className="h-full w-full object-cover"
              />
            ) : (
              image.label
            )}
          </div>
        </td>
        <td className="min-w-48 px-4 py-3 align-middle">
          <div className="flex items-center gap-1.5">
            <div className="font-medium">{drop.title}</div>
            {drop.status !== "closed" && (
              <Button
                variant="ghost"
                size="icon-xs"
                nativeButton={false}
                render={
                  <Link
                    href={`/drops/${drop.id}/edit`}
                    aria-label={`Edit ${drop.title}`}
                  />
                }
              >
                <Pencil />
              </Button>
            )}
          </div>
          {stats && stats.orderCount > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {stats.orderCount} orders · {formatCents(stats.revenueCents)}{" "}
              earned
            </div>
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <DropStatusDialog
            drop={drop}
            chargesEnabled={!!user.chargesEnabled}
          />
        </td>
        <td className="min-w-64 px-4 py-3 align-middle">
          <PublicLinkActions href={shareUrl} />
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <DashboardDropPrimaryAction
              dropId={drop.id}
              status={drop.status}
              chargesEnabled={!!user.chargesEnabled}
              orderCount={stats?.orderCount}
            />
          </div>
        </td>
      </tr>
    );
  }

  function renderMobileDrop(drop: Drop) {
    const shareUrl = `${BASE_URL}/${user.slug}/${drop.slug}`;
    const stats = statsMap.get(drop.id);
    const image = imageMap.get(drop.id) ?? { url: null, label: "No design" };

    return (
      <div key={drop.id} className="border-b p-4 last:border-0">
        <div className="flex gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-[10px] font-medium text-muted-foreground">
            {image.url ? (
              <img
                src={image.url}
                alt={`${drop.title} ${image.label.toLowerCase()}`}
                className="h-full w-full object-cover"
              />
            ) : (
              image.label
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate font-medium leading-tight">
                  {drop.title}
                </h2>
                {drop.status !== "closed" && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/drops/${drop.id}/edit`}
                        aria-label={`Edit ${drop.title}`}
                      />
                    }
                  >
                    <Pencil />
                  </Button>
                )}
              </div>
              <DropStatusDialog
                drop={drop}
                chargesEnabled={!!user.chargesEnabled}
              />
            </div>
            <PublicLinkActions href={shareUrl} />
            {stats && stats.orderCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {stats.orderCount} orders · {formatCents(stats.revenueCents)}{" "}
                earned
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <DashboardDropPrimaryAction
            dropId={drop.id}
            status={drop.status}
            chargesEnabled={!!user.chargesEnabled}
            orderCount={stats?.orderCount}
          />
        </div>
      </div>
    );
  }

  function renderFilterTabs() {
    return (
      <div className="flex rounded-md border bg-background p-1">
        {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((filter) => {
          const isActive = filter === statusFilter;
          return (
            <Link
              key={filter}
              href={filterHref(filter)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {FILTER_LABELS[filter]}
            </Link>
          );
        })}
      </div>
    );
  }

  function renderDropsTable() {
    if (visibleDrops.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No {FILTER_LABELS[statusFilter].toLowerCase()} drops.
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="overflow-hidden p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Public URL</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>{visibleDrops.map(renderDropRow)}</tbody>
          </table>
        </div>
        <div className="md:hidden">{visibleDrops.map(renderMobileDrop)}</div>
      </Card>
    );
  }

  function renderEmptyState() {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">No drops yet.</p>
          <Button nativeButton={false} render={<Link href="/drops/new" />}>
            Create your first drop
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <main className={APP_PAGE_CLASS}>
      <div className={`${APP_CONTENT_CLASS} space-y-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Your drops</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.name || user.email}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {drops.length > 0 && renderFilterTabs()}
            <Button nativeButton={false} render={<Link href="/drops/new" />}>
              New drop
            </Button>
          </div>
        </div>

        {needsStripe && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Connect Stripe to accept payments and go live with your drops.
              </p>
              <Button
                size="sm"
                nativeButton={false}
                render={<a href="/api/stripe/connect" />}
              >
                Enable checkout
              </Button>
            </CardContent>
          </Card>
        )}

        {drops.length === 0 ? renderEmptyState() : renderDropsTable()}
      </div>
    </main>
  );
}
