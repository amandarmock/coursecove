'use client';

import { useOrganization, useOrganizationList, useClerk } from '@clerk/nextjs';
import { CreditCard, Settings, Users, ChevronDown, Check, Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { MembershipRole } from '@prisma/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface OrgSwitcherProps {
  userRole: MembershipRole | null;
}

export function OrgSwitcher({ userRole }: OrgSwitcherProps) {
  const { organization } = useOrganization();
  const { organizationList, setActive } = useOrganizationList();
  const { openCreateOrganization } = useClerk();

  const isAdmin = userRole === MembershipRole.SUPER_ADMIN;

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={organization?.imageUrl} alt={organization?.name} />
            <AvatarFallback>
              {organization?.name ? getOrgInitials(organization.name) : <Building2 className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{organization?.name || 'Select Organization'}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {/* Admin-only menu items */}
        {isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing" className="flex items-center gap-2 cursor-pointer">
                <CreditCard className="h-4 w-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/team" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                User Management
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Organization list */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Organization
        </DropdownMenuLabel>
        {organizationList?.map((org) => {
          const isCurrentOrg = org.organization.id === organization?.id;
          return (
            <DropdownMenuItem
              key={org.organization.id}
              onClick={() => {
                if (!isCurrentOrg) {
                  setActive({ organization: org.organization.id });
                }
              }}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isCurrentOrg && 'bg-accent'
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={org.organization.imageUrl} alt={org.organization.name} />
                <AvatarFallback className="text-xs">
                  {getOrgInitials(org.organization.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{org.organization.name}</span>
              {isCurrentOrg && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        {/* Create organization */}
        <DropdownMenuItem
          onClick={() => openCreateOrganization()}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
