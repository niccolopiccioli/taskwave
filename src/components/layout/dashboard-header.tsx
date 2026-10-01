'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Menu, LayoutDashboard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Brand } from '@/components/layout/brand';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { PlanBadge } from '@/components/layout/plan-badge';
import { NotificationsInbox } from '@/components/layout/notifications-inbox';
import { useT } from '@/components/providers/i18n-provider';
import { AccountSettingsSheet } from '@/components/settings/account-settings-sheet';
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
  const t = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-[3.75rem] items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Brand href="/dashboard" size="sm" className="sm:hidden shrink-0 max-w-[120px] overflow-hidden" />
            <Brand href="/dashboard" size="md" className="hidden sm:flex shrink-0" />
            {workspaceName && (
              <div className="hidden md:flex items-center gap-2 min-w-0 border-l border-border pl-3">
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

            <ProfileMenu
              profile={profile}
              workspaceName={workspaceName}
              canInvite={canInvite}
              onInvite={onInvite}
              onLogout={onLogout}
              onManageBilling={onManageBilling}
              onSettingsOpen={() => setSettingsOpen(true)}
            />

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="group/settings relative flex h-8 w-8 items-center justify-center rounded-full outline-none transition-all hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Impostazioni"
              title="Impostazioni"
            >
              <Settings className="h-4 w-4 text-muted-foreground transition-all group-hover/settings:text-primary group-hover/settings:rotate-90 duration-300" />
            </button>

          </div>

          <div className="flex md:hidden items-center gap-1.5 ml-auto shrink-0">
            {canInvite && (
              <Button
                size="sm"
                onClick={onInvite}
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 text-xs font-semibold shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                {t.dashboard.inviteShort}
              </Button>
            )}
            <ProfileMenu
              profile={profile}
              workspaceName={workspaceName}
              canInvite={canInvite}
              onInvite={onInvite}
              onLogout={onLogout}
              onManageBilling={onManageBilling}
              onSettingsOpen={() => setSettingsOpen(true)}
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 shrink-0" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" hideClose className="w-[min(100vw-2rem,320px)] border-border bg-background backdrop-blur-2xl">
                <SheetHeader>
                  <SheetTitle className="text-left text-foreground">{t.dashboard.navigation}</SheetTitle>
                </SheetHeader>
                {profile && (
                  <div className="mt-4 flex items-center gap-2">
                    <PlanBadge plan={profile.plan} />
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-1">
                  <Link href="/dashboard" className="rounded-xl px-3 py-3 text-sm hover:bg-muted">
                    {t.dashboard.dashboard}
                  </Link>
                  <Link href="/docs" className="rounded-xl px-3 py-3 text-sm hover:bg-muted">
                    {t.dashboard.docs}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>

    <AccountSettingsSheet
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      profile={profile}
      onProfileUpdated={onProfileUpdated}
    />
    </>
  );
}
