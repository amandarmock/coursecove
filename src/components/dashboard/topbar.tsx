"use client"

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function QuestionMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

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
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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
          <QuestionMarkIcon className="h-5 w-5" />
        </button>
        <button
          className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          title="Notifications"
        >
          <BellIcon className="h-5 w-5" />
        </button>
        <div className="ml-2 border-l border-neutral-700 pl-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
                userButtonPopoverCard: "bg-neutral-900 border-neutral-700",
                userButtonPopoverActionButton: "text-neutral-300 hover:bg-neutral-800",
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
