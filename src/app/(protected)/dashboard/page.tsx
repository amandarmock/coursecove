"use client"

import { useEffect, useState } from "react"
import { useOrganization } from "@clerk/nextjs"
import { DashboardLayout } from "@/components/dashboard"
import { getOrganizationData, type OrganizationData } from "./actions"

// Stat card component
function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
}: {
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <p className="text-sm font-medium text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-neutral-100">{value}</p>
      {change && (
        <p
          className={`mt-1 text-sm ${
            changeType === "positive"
              ? "text-green-400"
              : changeType === "negative"
              ? "text-red-400"
              : "text-neutral-500"
          }`}
        >
          {change}
        </p>
      )}
    </div>
  )
}

// Quick action card
function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-neutral-100">{title}</h3>
        <p className="mt-0.5 text-sm text-neutral-400">{description}</p>
      </div>
    </a>
  )
}

// Activity item component
function ActivityItem({
  title,
  description,
  time,
  type = "default",
}: {
  title: string
  description: string
  time: string
  type?: "booking" | "cancellation" | "payment" | "default"
}) {
  const dotColors = {
    booking: "bg-green-400",
    cancellation: "bg-red-400",
    payment: "bg-blue-400",
    default: "bg-neutral-400",
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`mt-1.5 h-2 w-2 rounded-full ${dotColors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-200">{title}</p>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <span className="text-xs text-neutral-500 whitespace-nowrap">{time}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { organization, isLoaded } = useOrganization()
  const [orgData, setOrgData] = useState<OrganizationData | null>(null)

  // Fetch organization data including serves_minors flag
  useEffect(() => {
    if (isLoaded && organization) {
      getOrganizationData().then(setOrgData)
    }
  }, [isLoaded, organization])

  return (
    <DashboardLayout>
      <div className="min-h-full bg-neutral-950">
        {/* Page header */}
        <header className="border-b border-neutral-800 bg-neutral-900/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-neutral-100">Dashboard</h1>
              <p className="text-sm text-neutral-400">
                Welcome back! Here&apos;s what&apos;s happening with your business.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700">
                View Reports
              </button>
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500">
                New Booking
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Family Accounts Banner - shown when serves_minors is enabled */}
          {orgData?.servesMinors && (
            <div className="mb-6 rounded-xl border border-blue-900/50 bg-blue-950/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-900/50">
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-100">Family Accounts Enabled</h3>
                  <p className="mt-1 text-sm text-blue-300/80">
                    Since your business serves minors, parents can create managed profiles for their
                    children. This ensures compliance with children&apos;s privacy laws.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Bookings"
              value="0"
              change="Get started by adding services"
              changeType="neutral"
            />
            <StatCard
              label="Active Clients"
              value="0"
              change="Invite your first client"
              changeType="neutral"
            />
            <StatCard
              label="Team Members"
              value={organization?.membersCount || 1}
              change="Manage your team"
              changeType="neutral"
            />
            <StatCard
              label="Revenue (MTD)"
              value="$0"
              change="Connect payments to track"
              changeType="neutral"
            />
          </div>

          {/* Main content grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick actions */}
            <div className="lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Quick Actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  }
                  title="Add a Service"
                  description="Create appointment types your clients can book"
                  href="/dashboard/services/new"
                />
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  }
                  title="Invite Team Member"
                  description="Add instructors and staff to your team"
                  href="/dashboard/team/invite"
                />
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                  title="Set Availability"
                  description="Configure your business hours and schedule"
                  href="/dashboard/settings/availability"
                />
                <QuickActionCard
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  }
                  title="Connect Payments"
                  description="Set up Stripe to accept payments"
                  href="/dashboard/settings/payments"
                />
              </div>
            </div>

            {/* Recent activity */}
            <div>
              <h2 className="mb-4 text-lg font-semibold text-neutral-100">Recent Activity</h2>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="divide-y divide-neutral-800">
                  <ActivityItem
                    title="Account Created"
                    description="Your workspace is ready to use"
                    time="Just now"
                    type="default"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-neutral-500">
                    Activity will appear here as you use CourseCove
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Getting started section */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-neutral-100">Getting Started</h2>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium text-neutral-100">Complete your setup</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    Finish setting up your business to start accepting bookings
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-neutral-800">
                    <div className="h-2 w-8 rounded-full bg-brand-500" />
                  </div>
                  <span className="text-sm text-neutral-400">25%</span>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg bg-brand-600/10 p-3 border border-brand-600/20">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-brand-400">Create account</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-3 border border-neutral-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-600 text-neutral-500">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <span className="text-sm font-medium text-neutral-300">Add services</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-3 border border-neutral-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-600 text-neutral-500">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <span className="text-sm font-medium text-neutral-300">Set availability</span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-3 border border-neutral-700">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-neutral-600 text-neutral-500">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <span className="text-sm font-medium text-neutral-300">Connect payments</span>
                </div>
              </div>
            </div>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 rounded-lg bg-neutral-900 border border-neutral-800 p-3 text-center text-xs text-neutral-500">
              <p>Organization ID: {organization?.id || "Not set"}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
