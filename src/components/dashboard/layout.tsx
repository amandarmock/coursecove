"use client"

import { useState, useEffect } from "react"
import { Topbar } from "./topbar"
import { Sidebar } from "./sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Dashboard Layout (Client Component)
 *
 * Handles UI concerns only:
 * - Sidebar collapse state (persisted to localStorage)
 * - Layout structure (Topbar, Sidebar, main content)
 *
 * Auth is handled by the parent Server Component via DAL.
 * This component assumes the user is already authenticated.
 *
 * @see docs/architecture/adrs/004-authentication-enforcement.md
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage (client-side hydration)
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrating from localStorage on mount
      setSidebarCollapsed(saved === "true")
    }
  }, [])

  // Save sidebar state to localStorage
  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
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
