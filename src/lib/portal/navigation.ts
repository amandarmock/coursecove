import { MembershipRole } from '@prisma/client';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  BookOpen,
  ShoppingBag,
  GraduationCap,
  User,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

/**
 * Navigation item configuration
 */
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Roles that can see this item. If empty/undefined, all roles can see it */
  roles?: MembershipRole[];
  /** Whether this feature is coming soon (disabled state) */
  comingSoon?: boolean;
  /** Child navigation items */
  children?: NavItem[];
}

/**
 * Main navigation configuration for the business portal
 */
export const navigationConfig: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Teaching',
    href: '/teaching',
    icon: BookOpen,
    roles: [MembershipRole.SUPER_ADMIN, MembershipRole.ADMIN, MembershipRole.INSTRUCTOR],
  },
  {
    title: 'Business Settings',
    href: '/settings',
    icon: Settings,
    roles: [MembershipRole.SUPER_ADMIN],
    children: [
      {
        title: 'Locations',
        href: '/business/locations',
        icon: MapPin,
      },
      {
        title: 'Private Lessons',
        href: '/business/private-lessons',
        icon: GraduationCap,
      },
      {
        title: 'Appointments',
        href: '/business/appointments',
        icon: Calendar,
      },
    ],
  },
];

/**
 * Check if a user with a given role can access a nav item
 */
export function canAccessNavItem(item: NavItem, userRole: MembershipRole | null): boolean {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }
  if (!userRole) {
    return false;
  }
  return item.roles.includes(userRole);
}

/**
 * Filter navigation items based on user role
 */
export function getFilteredNavigation(userRole: MembershipRole | null): NavItem[] {
  return navigationConfig
    .filter((item) => canAccessNavItem(item, userRole))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => canAccessNavItem(child, userRole)),
    }));
}
