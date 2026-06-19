'use client';

import Link from 'next/link';
import { UserPlus, Menu, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand } from '@/components/layout/brand';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { PlanBadge } from '@/components/layout/plan-badge';
import { NotificationsInbox } from '@/components/layout/notifications-inbox';
import type { Profile } from '@/lib/database.types';

interface DashboardHeaderProps {
  profile: Profile | null;
  workspaceName?: string;
  canInvite?: boolean;
  onInvite: () => void;
  onLogout: () => void;
  onManageBilling: () => void;
  onProfileUpdated?: (profile: Profile) => void;
}

export function DashboardHeader({
  profile,
  workspaceName,
  canInvite = false,
  onInvite,
  onLogout,
  onManageBilling,
  onProfileUpdated,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-2xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-[3.75rem] items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Brand href="/dashboard" size="sm" className="sm:hidden shrink-0" />
            <Brand href="/dashboard" size="md" className="hidden sm:flex shrink-0" />
            {workspaceName && (
              <div className="hidden md:flex items-center gap-2 min-w-0 border-l border-white/[0.08] pl-3">
                <LayoutDashboard className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="text-sm font-medium text-foreground truncate max-w-[140px] lg:max-w-[200px]">
                  {workspaceName}
                </span>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {profile && <PlanBadge plan={profile.plan} />}
            <NotificationsInbox />

            {canInvite && (
              <Button
                size="sm"
                onClick={onInvite}
                className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 font-semibold shadow-lg shadow-teal-500/20 gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                Invita team
              </Button>
            )}

            <ProfileMenu
              profile={profile}
              workspaceName={workspaceName}
              canInvite={canInvite}
              onInvite={onInvite}
              onLogout={onLogout}
              onManageBilling={onManageBilling}
              onProfileUpdated={onProfileUpdated}
            />
          </div>

          <div className="flex md:hidden items-center gap-2 ml-auto">
            {profile && <PlanBadge plan={profile.plan} />}
            {canInvite && (
              <Button
                size="sm"
                onClick={onInvite}
                className="rounded-full bg-teal-500 hover:bg-teal-400 text-zinc-950 h-8 px-3 text-xs font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Invita
              </Button>
            )}
            <ProfileMenu
              profile={profile}
              workspaceName={workspaceName}
              canInvite={canInvite}
              onInvite={onInvite}
              onLogout={onLogout}
              onManageBilling={onManageBilling}
              onProfileUpdated={onProfileUpdated}
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100vw-2rem,320px)] border-white/[0.08] bg-zinc-950/95 backdrop-blur-2xl">
                <SheetHeader>
                  <SheetTitle className="text-left text-foreground">Navigazione</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  <Link href="/dashboard" className="rounded-xl px-3 py-3 text-sm hover:bg-white/[0.04]">
                    Dashboard
                  </Link>
                  <Link href="/docs" className="rounded-xl px-3 py-3 text-sm hover:bg-white/[0.04]">
                    Documentazione
                  </Link>
                  <Link href="/pricing" className="rounded-xl px-3 py-3 text-sm hover:bg-white/[0.04]">
                    Prezzi
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
