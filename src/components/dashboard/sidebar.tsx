"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Icon components
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function CogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  )
}

function PuzzleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  )
}

function LightningBoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive?: boolean
  badge?: string | number
}

function NavItem({ href, icon, label, isActive, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-600/20 text-brand-400"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
      }`}
    >
      <span className="h-5 w-5 flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs font-medium text-neutral-300">
          {badge}
        </span>
      )}
    </Link>
  )
}

interface NavSectionProps {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  action?: React.ReactNode
}

function NavSection({ title, children, defaultExpanded = true, action }: NavSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex flex-1 items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-400"
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-3 w-3" />
          ) : (
            <ChevronRightIcon className="h-3 w-3" />
          )}
          {title}
        </button>
        {action && <div className="pr-2">{action}</div>}
      </div>
      {isExpanded && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<"settings" | "people">("settings")

  if (isCollapsed) {
    return (
      <aside className="flex h-full w-14 flex-col bg-neutral-900 border-r border-neutral-800">
        <div className="flex h-12 items-center justify-center border-b border-neutral-800">
          <button
            onClick={onToggle}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center justify-center rounded-lg p-2 ${
                pathname === "/dashboard"
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
              title="Dashboard"
            >
              <HomeIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/calendar"
              className={`flex items-center justify-center rounded-lg p-2 ${
                pathname === "/dashboard/calendar"
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
              title="Calendar"
            >
              <CalendarIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/clients"
              className={`flex items-center justify-center rounded-lg p-2 ${
                pathname === "/dashboard/clients"
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
              title="Clients"
            >
              <UsersIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/settings"
              className={`flex items-center justify-center rounded-lg p-2 ${
                pathname?.startsWith("/dashboard/settings")
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
              title="Settings"
            >
              <CogIcon className="h-5 w-5" />
            </Link>
          </div>
        </nav>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-neutral-900 border-r border-neutral-800">
      {/* Settings / People tabs */}
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "border-b-2 border-brand-500 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <CogIcon className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab("people")}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            activeTab === "people"
              ? "border-b-2 border-brand-500 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <UsersIcon className="h-4 w-4" />
          People
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {activeTab === "settings" ? (
          <>
            {/* Manage section */}
            <NavSection title="Manage">
              <NavItem
                href="/dashboard/services"
                icon={<PuzzleIcon className="h-5 w-5" />}
                label="Services"
                isActive={pathname === "/dashboard/services"}
              />
              <NavItem
                href="/dashboard/templates"
                icon={<TemplateIcon className="h-5 w-5" />}
                label="Templates"
                isActive={pathname === "/dashboard/templates"}
              />
              <NavItem
                href="/dashboard/automations"
                icon={<LightningBoltIcon className="h-5 w-5" />}
                label="Automations"
                isActive={pathname === "/dashboard/automations"}
              />
              <NavItem
                href="/dashboard/settings"
                icon={<CogIcon className="h-5 w-5" />}
                label="Settings"
                isActive={pathname === "/dashboard/settings"}
              />
            </NavSection>

            {/* Spaces / Main Navigation */}
            <NavSection
              title="Spaces"
              action={
                <button className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300">
                  <PlusIcon className="h-4 w-4" />
                </button>
              }
            >
              <NavItem
                href="/dashboard"
                icon={<HomeIcon className="h-5 w-5" />}
                label="Dashboard"
                isActive={pathname === "/dashboard"}
              />
              <NavItem
                href="/dashboard/calendar"
                icon={<CalendarIcon className="h-5 w-5" />}
                label="Calendar"
                isActive={pathname === "/dashboard/calendar"}
              />
              <NavItem
                href="/dashboard/bookings"
                icon={<ClipboardListIcon className="h-5 w-5" />}
                label="Bookings"
                isActive={pathname === "/dashboard/bookings"}
              />
              <NavItem
                href="/dashboard/clients"
                icon={<UsersIcon className="h-5 w-5" />}
                label="Clients"
                isActive={pathname?.startsWith("/dashboard/clients")}
              />
              <NavItem
                href="/dashboard/billing"
                icon={<CreditCardIcon className="h-5 w-5" />}
                label="Billing"
                isActive={pathname === "/dashboard/billing"}
              />
              <NavItem
                href="/dashboard/reports"
                icon={<ChartBarIcon className="h-5 w-5" />}
                label="Reports"
                isActive={pathname === "/dashboard/reports"}
              />
            </NavSection>
          </>
        ) : (
          <>
            {/* People / Team section */}
            <NavSection title="Team">
              <NavItem
                href="/dashboard/team"
                icon={<UsersIcon className="h-5 w-5" />}
                label="All Members"
                isActive={pathname === "/dashboard/team"}
              />
              <NavItem
                href="/dashboard/team/invite"
                icon={<PlusIcon className="h-5 w-5" />}
                label="Invite Member"
                isActive={pathname === "/dashboard/team/invite"}
              />
            </NavSection>

            <NavSection title="Clients">
              <NavItem
                href="/dashboard/clients"
                icon={<UsersIcon className="h-5 w-5" />}
                label="All Clients"
                isActive={pathname === "/dashboard/clients"}
              />
              <NavItem
                href="/dashboard/clients/new"
                icon={<PlusIcon className="h-5 w-5" />}
                label="Add Client"
                isActive={pathname === "/dashboard/clients/new"}
              />
            </NavSection>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-neutral-800 p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        >
          <MenuIcon className="h-4 w-4" />
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  )
}
