'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem, getFilteredNavigation } from '@/lib/portal/navigation';
import { MembershipRole } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { OrgSwitcher } from './org-switcher';

interface SidebarProps {
  userRole: MembershipRole | null;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = getFilteredNavigation(userRole);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Org Switcher */}
        <div className="flex w-full h-16 items-center border-b border-sidebar-border px-4">
          <OrgSwitcher userRole={userRole} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  depth?: number;
  onNavigate: () => void;
}

function NavItemComponent({
  item,
  pathname,
  depth = 0,
  onNavigate,
}: NavItemComponentProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-expand if current path is within this section
    if (item.children) {
      return (
        pathname === item.href ||
        item.children.some((child) => pathname.startsWith(child.href))
      );
    }
    return false;
  });

  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            depth > 0 && 'pl-8'
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {item.title}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <ul className="mt-1 space-y-1">
            {item.children!.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                pathname={pathname}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (item.comingSoon) {
    return (
      <li>
        <span
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
            'text-sidebar-foreground/50 cursor-not-allowed',
            depth > 0 && 'pl-8'
          )}
        >
          <Icon className="h-4 w-4" />
          {item.title}
          <Badge variant="secondary" className="ml-auto text-xs">
            Soon
          </Badge>
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          depth > 0 && 'pl-8'
        )}
      >
        <Icon className="h-4 w-4" />
        {item.title}
      </Link>
    </li>
  );
}
