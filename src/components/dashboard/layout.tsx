"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Topbar } from "./topbar"
import { Sidebar } from "./sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setSidebarCollapsed(saved === "true")
    }
  }, [])

  // Save sidebar state to localStorage
  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
  }

  // Auth redirects
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
    if (isLoaded && isSignedIn && !user?.publicMetadata?.onboardingComplete) {
      router.push("/onboarding")
    }
  }, [isLoaded, isSignedIn, user, router])

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-700 border-t-brand-500" />
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      {/* Top bar - full width */}
      <Topbar />

      {/* Content area - sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
