"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  Home,
  Calendar,
  Users,
  Settings,
  ClipboardList,
  CreditCard,
  BarChart3,
  Menu,
  LayoutTemplate,
  Puzzle,
  Zap,
  Plus,
} from "lucide-react"

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
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
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
            <Menu className="h-5 w-5" />
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
              <Home className="h-5 w-5" />
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
              <Calendar className="h-5 w-5" />
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
              <Users className="h-5 w-5" />
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
              <Settings className="h-5 w-5" />
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
          <Settings className="h-4 w-4" />
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
          <Users className="h-4 w-4" />
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
                icon={<Puzzle className="h-5 w-5" />}
                label="Services"
                isActive={pathname === "/dashboard/services"}
              />
              <NavItem
                href="/dashboard/templates"
                icon={<LayoutTemplate className="h-5 w-5" />}
                label="Templates"
                isActive={pathname === "/dashboard/templates"}
              />
              <NavItem
                href="/dashboard/automations"
                icon={<Zap className="h-5 w-5" />}
                label="Automations"
                isActive={pathname === "/dashboard/automations"}
              />
              <NavItem
                href="/dashboard/settings"
                icon={<Settings className="h-5 w-5" />}
                label="Settings"
                isActive={pathname === "/dashboard/settings"}
              />
            </NavSection>

            {/* Spaces / Main Navigation */}
            <NavSection
              title="Spaces"
              action={
                <button className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300">
                  <Plus className="h-4 w-4" />
                </button>
              }
            >
              <NavItem
                href="/dashboard"
                icon={<Home className="h-5 w-5" />}
                label="Dashboard"
                isActive={pathname === "/dashboard"}
              />
              <NavItem
                href="/dashboard/calendar"
                icon={<Calendar className="h-5 w-5" />}
                label="Calendar"
                isActive={pathname === "/dashboard/calendar"}
              />
              <NavItem
                href="/dashboard/bookings"
                icon={<ClipboardList className="h-5 w-5" />}
                label="Bookings"
                isActive={pathname === "/dashboard/bookings"}
              />
              <NavItem
                href="/dashboard/clients"
                icon={<Users className="h-5 w-5" />}
                label="Clients"
                isActive={pathname?.startsWith("/dashboard/clients")}
              />
              <NavItem
                href="/dashboard/billing"
                icon={<CreditCard className="h-5 w-5" />}
                label="Billing"
                isActive={pathname === "/dashboard/billing"}
              />
              <NavItem
                href="/dashboard/reports"
                icon={<BarChart3 className="h-5 w-5" />}
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
                icon={<Users className="h-5 w-5" />}
                label="All Members"
                isActive={pathname === "/dashboard/team"}
              />
              <NavItem
                href="/dashboard/team/invite"
                icon={<Plus className="h-5 w-5" />}
                label="Invite Member"
                isActive={pathname === "/dashboard/team/invite"}
              />
            </NavSection>

            <NavSection title="Clients">
              <NavItem
                href="/dashboard/clients"
                icon={<Users className="h-5 w-5" />}
                label="All Clients"
                isActive={pathname === "/dashboard/clients"}
              />
              <NavItem
                href="/dashboard/clients/new"
                icon={<Plus className="h-5 w-5" />}
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
          <Menu className="h-4 w-4" />
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  )
}
