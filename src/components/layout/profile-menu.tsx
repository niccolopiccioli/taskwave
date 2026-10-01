'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LogOut,
  UserPlus,
  CreditCard,
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Zap,
  ChevronRight,
  Users,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile } from '@/lib/database.types';
import { planLabel } from '@/lib/plans';
import { cn } from '@/lib/utils';

interface ProfileMenuProps {
  profile: Profile | null;
  workspaceName?: string;
  canInvite?: boolean;
  onInvite: () => void;
  onLogout: () => void;
  onManageBilling: () => void;
  onSettingsOpen?: () => void;
}

function MenuRow({
  icon: Icon,
  label,
  description,
  onClick,
  href,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
}) {
  const inner = (
    <>
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          destructive ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.06] text-teal-400'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={cn('text-sm font-medium', destructive ? 'text-red-400' : 'text-foreground')}>
          {label}
        </p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </>
  );

  const className =
    'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40';

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

export function ProfileMenu({
  profile,
  workspaceName,
  canInvite = false,
  onInvite,
  onLogout,
  onManageBilling,
  onSettingsOpen,
}: ProfileMenuProps) {
  const initials = profile?.full_name?.charAt(0).toUpperCase() || 'U';
  const firstName = profile?.full_name?.split(' ')[0] || 'Utente';
  const isFree = profile?.plan === 'free';

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Menu profilo"
            >
              <span className="absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/10 group-data-[state=open]:bg-primary/15 transition-colors scale-150" />
              <span className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-primary/30 group-data-[state=open]:ring-primary/50 transition-all" />
              <div
                className="relative w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-shadow group-hover:shadow-primary/30"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))',
                }}
              >
                <span className="text-primary-foreground text-sm font-bold">{initials}</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-[min(calc(100vw-2rem),320px)] p-0 border-border/60 bg-popover/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden rounded-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="relative px-4 pt-4 pb-3 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-amber-500/10 pointer-events-none" />
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))',
                        boxShadow: '0 10px 30px -8px hsl(var(--primary) / 0.4)',
                      }}
                    >
                      <span className="text-primary-foreground text-xl font-bold">{initials}</span>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-popover flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="font-semibold text-foreground truncate">
                      {profile?.full_name || 'Utente'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{profile?.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        <Sparkles className="w-3 h-3" />
                        {profile ? planLabel(profile.plan) : '—'}
                      </span>
                      {workspaceName && (
                        <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 border border-border truncate max-w-[120px]">
                          {workspaceName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isFree && (
                <div className="mx-3 mb-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Passa a Pro</p>
                      <p className="text-[11px] text-muted-foreground">Workspace e membri illimitati</p>
                    </div>
                    <Link
                      href="/pricing"
                      className="text-xs font-semibold text-primary hover:opacity-80 shrink-0"
                    >
                      Upgrade
                    </Link>
                  </div>
                </div>
              )}

              <div className="px-2 pb-2 space-y-0.5">
                <MenuRow
                  icon={Settings}
                  label="Impostazioni"
                  description="Profilo, tema e notifiche"
                  onClick={() => onSettingsOpen?.()}
                />
                <MenuRow
                  icon={LayoutDashboard}
                  label="Dashboard"
                  description="Board e workspace"
                  href="/dashboard"
                />
                <MenuRow icon={Users} label="Team" description="Membri e permessi" href="/dashboard#team" />
                {canInvite && (
                  <MenuRow
                    icon={UserPlus}
                    label="Invita team"
                    description="Invia invito via email"
                    onClick={onInvite}
                  />
                )}
                {profile?.stripe_customer_id && (
                  <MenuRow
                    icon={CreditCard}
                    label="Fatturazione"
                    description="Piano e pagamenti"
                    onClick={onManageBilling}
                  />
                )}
                <MenuRow icon={BookOpen} label="Documentazione" description="API e integrazioni" href="/docs" />
              </div>

              <div className="border-t border-border/60 p-2">
                <MenuRow
                  icon={LogOut}
                  label="Esci"
                  description={`A presto, ${firstName}`}
                  onClick={onLogout}
                  destructive
                />
              </div>
            </motion.div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
