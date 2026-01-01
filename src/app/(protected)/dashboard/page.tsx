import { requireOrg } from "@/lib/dal"
import { DashboardLayout } from "@/components/dashboard"
import { DashboardContent } from "./dashboard-content"
import { getOrganizationData } from "./actions"

/**
 * Dashboard Page (Server Component)
 *
 * Security: Uses DAL's requireOrg() for authentication verification.
 * This is THE security boundary - proxy.ts is just UX optimization.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */
export default async function DashboardPage() {
  // Layer 2: Server-side auth verification (security boundary)
  await requireOrg()

  // Server-side data fetching
  const orgData = await getOrganizationData()

  return (
    <DashboardLayout>
      <DashboardContent orgData={orgData} />
    </DashboardLayout>
  )
}
