import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AppNavigationClient } from "@/components/app-navigation-client"

export async function AppNavigation() {
  const session = await auth.api.getSession({ headers: await headers() })

  return <AppNavigationClient initialIsAuthenticated={Boolean(session)} />
}
