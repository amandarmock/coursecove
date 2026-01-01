"use client"

import { useState, useRef, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { Settings, LogOut, ChevronDown } from "lucide-react"
import Image from "next/image"

export function UserMenu() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  if (!user) return null

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "?"
  const imageUrl = user.imageUrl

  const handlePersonalSettings = () => {
    setIsOpen(false)
    openUserProfile()
  }

  const handleSignOut = () => {
    setIsOpen(false)
    signOut({ redirectUrl: "/sign-in" })
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-neutral-800 transition-colors"
      >
        <div className="relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={user.fullName || "User"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-medium text-white">
              {initials}
            </div>
          )}
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-neutral-900 bg-emerald-500" />
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl z-50">
          {/* User info header */}
          <div className="px-3 py-2 border-b border-neutral-700">
            <p className="text-sm font-medium text-neutral-200 truncate">
              {user.fullName || "User"}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={handlePersonalSettings}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Personal Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
