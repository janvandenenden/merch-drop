import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.name || user.email}.
            </p>
          </div>
          <SignOutButton />
        </div>

        {user.slug ? (
          <p className="text-sm">
            Your store:{" "}
            <span className="font-mono font-medium">
              merch-drop.com/{user.slug}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No store slug set yet.
          </p>
        )}
      </div>
    </main>
  );
}
