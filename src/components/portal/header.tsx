'use client';

import { Menu } from 'lucide-react';
import { MembershipRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from './user-menu';

interface HeaderProps {
  onMenuClick: () => void;
  userRole: MembershipRole | null;
}

export function Header({ onMenuClick, userRole }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Left side - Mobile menu button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Right side - Theme toggle and User menu */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu userRole={userRole} />
      </div>
    </header>
  );
}
