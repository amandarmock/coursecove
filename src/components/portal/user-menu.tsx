'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { MembershipRole } from '@prisma/client';
import { Settings, Clock, Shield, LogOut, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Roles that can be instructors (have availability)
const INSTRUCTOR_CAPABLE_ROLES: MembershipRole[] = [
  MembershipRole.SUPER_ADMIN,
  MembershipRole.INSTRUCTOR,
];

function canBeInstructor(role: MembershipRole | null): boolean {
  if (!role) return false;
  return INSTRUCTOR_CAPABLE_ROLES.includes(role);
}

interface UserMenuProps {
  userRole: MembershipRole | null;
}

export function UserMenu({ userRole }: UserMenuProps) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U';

  const handleSignOut = () => {
    signOut({ redirectUrl: '/sign-in' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push('/account/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        {canBeInstructor(userRole) && (
          <DropdownMenuItem onClick={() => router.push('/account/availability')}>
            <Clock className="mr-2 h-4 w-4" />
            Availability
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => openUserProfile()}>
          <Shield className="mr-2 h-4 w-4" />
          Security
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
