"use client"

import { OrganizationSwitcher } from "@clerk/nextjs"
import { Search, Bell, HelpCircle } from "lucide-react"
import { UserMenu } from "./user-menu"

export function Topbar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3">
      {/* Left section - Org Switcher */}
      <div className="flex items-center gap-2">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex items-center",
              organizationSwitcherTrigger:
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-neutral-200 hover:bg-neutral-800 [&>span]:truncate [&>span]:max-w-[180px]",
              organizationPreviewMainIdentifier: "text-sm font-semibold text-neutral-200",
              organizationPreviewSecondaryIdentifier: "text-xs text-neutral-500",
              organizationSwitcherPopoverCard: "bg-neutral-900 border-neutral-700",
              organizationSwitcherPopoverActions: "border-neutral-700",
              organizationSwitcherPopoverActionButton: "text-neutral-300 hover:bg-neutral-800",
              organizationPreviewAvatarBox: "h-6 w-6",
            },
          }}
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/onboarding"
        />
      </div>

      {/* Center section - Search */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-1.5 pl-9 pr-12 text-sm text-neutral-200 placeholder-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-neutral-600 bg-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section - Actions & User */}
      <div className="flex items-center gap-1">
        <button
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <button
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="ml-2 border-l border-neutral-700 pl-3">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
