'use client';

import { useState, useEffect } from 'react';
import {
  Crown,
  Shield,
  User,
  MoreHorizontal,
  UserMinus,
  ShieldPlus,
  ShieldMinus,
  LogOut,
  Plus,
  Settings,
  Trash2,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { PlanTier, WorkspaceWithMembers } from '@/lib/database.types';
import { hasFeature } from '@/lib/plans';
import { PlanGate } from '@/components/plan/plan-gate';
import {
  canManageMembers,
  canRemoveMember,
  canChangeMemberRole,
  canLeaveWorkspace,
  canDeleteWorkspace,
  canUpdateWorkspace,
  canInviteMembers,
  roleLabel,
  getWorkspaceAccessRole,
} from '@/lib/workspace-permissions';
import {
  removeWorkspaceMember,
  updateMemberRole,
  leaveWorkspace,
  updateWorkspaceApi,
  deleteWorkspaceApi,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  listWorkspaceInvitations,
  cancelWorkspaceInvitation,
} from '@/lib/data';
import { cn } from '@/lib/utils';

interface WorkspaceTeamPanelProps {
  workspace: WorkspaceWithMembers;
  currentUserId: string;
  plan: PlanTier;
  onInvite: () => void;
  onRefresh: () => Promise<void>;
  onWorkspaceDeleted?: () => void;
}

function RoleBadge({
  isOwner,
  role,
}: {
  isOwner: boolean;
  role: 'admin' | 'member';
}) {
  if (isOwner) {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/15">
        <Crown className="w-3 h-3" />
        Proprietario
      </Badge>
    );
  }
  if (role === 'admin') {
    return (
      <Badge className="gap-1 bg-teal-500/15 text-teal-400 border-teal-500/30 hover:bg-teal-500/15">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <User className="w-3 h-3" />
      Membro
    </Badge>
  );
}

export function WorkspaceTeamPanel({
  workspace,
  currentUserId,
  plan,
  onInvite,
  onRefresh,
  onWorkspaceDeleted,
}: WorkspaceTeamPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [isPrivate, setIsPrivate] = useState(workspace.is_private ?? false);
  const [accentColor, setAccentColor] = useState(workspace.accent_color || '#14b8a6');
  const [apiKeyName, setApiKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<
    Array<{ id: string; name: string; key_prefix: string; created_at: string }>
  >([]);
  const [pendingInvites, setPendingInvites] = useState<
    Array<{ id: string; email: string; created_at: string; expires_at: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = canManageMembers(workspace, currentUserId);
  const isOwner = canDeleteWorkspace(workspace, currentUserId);
  const canInvite = canInviteMembers(workspace, currentUserId);
  const canEdit = canUpdateWorkspace(workspace, currentUserId);
  const canLeave = canLeaveWorkspace(workspace, currentUserId);
  const myRole = getWorkspaceAccessRole(workspace, currentUserId);

  useEffect(() => {
    if (!isAdmin) return;
    listWorkspaceInvitations(workspace.id)
      .then(setPendingInvites)
      .catch(() => setPendingInvites([]));
  }, [workspace.id, isAdmin, workspace.members.length]);

  const refreshPendingInvites = async () => {
    if (!isAdmin) return;
    try {
      setPendingInvites(await listWorkspaceInvitations(workspace.id));
    } catch {
      setPendingInvites([]);
    }
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    setError(null);
    try {
      await fn();
      await onRefresh();
      await refreshPendingInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await runAction(`remove-${removeTarget.userId}`, async () => {
      await removeWorkspaceMember(workspace.id, removeTarget.userId);
      setRemoveTarget(null);
    });
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    await runAction(`role-${userId}`, async () => {
      await updateMemberRole(workspace.id, userId, role);
    });
  };

  const handleLeave = async () => {
    await runAction('leave', async () => {
      await leaveWorkspace(workspace.id);
      setLeaveOpen(false);
      onWorkspaceDeleted?.();
    });
  };

  const handleSaveSettings = async () => {
    await runAction('settings', async () => {
      await updateWorkspaceApi(workspace.id, {
        name: workspaceName,
        ...(hasFeature(plan, 'privateWorkspace') ? { is_private: isPrivate } : {}),
        ...(hasFeature(plan, 'workspaceAccent') ? { accent_color: accentColor } : {}),
      });
      setSettingsOpen(false);
    });
  };

  const loadApiKeys = async () => {
    if (!hasFeature(plan, 'apiKeys')) return;
    try {
      const keys = await listApiKeys(workspace.id);
      setApiKeys(keys);
    } catch {
      setApiKeys([]);
    }
  };

  const handleCreateApiKey = async () => {
    if (!apiKeyName.trim()) return;
    await runAction('api-key', async () => {
      const result = await createApiKey(workspace.id, apiKeyName.trim());
      setNewApiKey(result.key);
      setApiKeyName('');
      await loadApiKeys();
    });
  };

  const handleDelete = async () => {
    await runAction('delete', async () => {
      await deleteWorkspaceApi(workspace.id);
      setDeleteOpen(false);
      onWorkspaceDeleted?.();
    });
  };

  const handleCancelInvite = async (invitationId: string) => {
    await runAction(`cancel-${invitationId}`, async () => {
      await cancelWorkspaceInvitation(workspace.id, invitationId);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invitationId));
    });
  };

  return (
    <>
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Team & permessi
              {myRole && (
                <Badge variant="outline" className="text-xs font-normal">
                  Il tuo ruolo: {roleLabel(myRole, isOwner)}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isAdmin
                ? 'Gestisci membri, ruoli e impostazioni del workspace.'
                : 'Visualizza i membri del team. Solo gli admin possono invitare o rimuovere.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSettingsOpen(true);
                  loadApiKeys();
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Impostazioni
              </Button>
            )}
            {canInvite && (
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-zinc-950" onClick={onInvite}>
                <Plus className="w-4 h-4 mr-2" />
                Invita
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {isAdmin && pendingInvites.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Inviti in attesa di conferma
                </p>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.03]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">In attesa di accettazione</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-red-400"
                      disabled={actionLoading === `cancel-${invite.id}`}
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      {actionLoading === `cancel-${invite.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Annulla'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {workspace.members.map((member) => {
              const isMemberOwner = workspace.owner_id === member.user_id;
              const isSelf = member.user_id === currentUserId;
              const showAdminMenu =
                isAdmin &&
                !isSelf &&
                (canRemoveMember(workspace, currentUserId, member.user_id) ||
                  canChangeMemberRole(workspace, currentUserId, member.user_id));

              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60',
                    isSelf && 'ring-1 ring-teal-500/20 bg-teal-500/[0.03]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500/20 to-teal-600/10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-teal-500/20">
                      <span className="text-teal-400 text-sm font-semibold">
                        {member.profile.full_name?.charAt(0) ||
                          member.profile.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate flex items-center gap-2">
                        {member.profile.full_name || 'Utente'}
                        {isSelf && (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            tu
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge isOwner={isMemberOwner} role={member.role} />

                    {showAdminMenu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            disabled={!!actionLoading}
                          >
                            {actionLoading?.startsWith(`role-${member.user_id}`) ||
                            actionLoading === `remove-${member.user_id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {member.role === 'member' && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, 'admin')}
                            >
                              <ShieldPlus className="w-4 h-4 mr-2" />
                              Promuovi ad admin
                            </DropdownMenuItem>
                          )}
                          {member.role === 'admin' && !isMemberOwner && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, 'member')}
                            >
                              <ShieldMinus className="w-4 h-4 mr-2" />
                              Retrocedi a membro
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-400"
                            onClick={() =>
                              setRemoveTarget({
                                userId: member.user_id,
                                name: member.profile.full_name || member.profile.email,
                              })
                            }
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Rimuovi dal workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {canLeave && (
            <div className="mt-6 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                onClick={() => setLeaveOpen(true)}
                disabled={!!actionLoading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Esci da questo workspace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Rimuovi membro</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `Vuoi rimuovere ${removeTarget.name} dal workspace ${workspace.name}? Perderà l'accesso a board e task.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={actionLoading === `remove-${removeTarget?.userId}`}
            >
              {actionLoading === `remove-${removeTarget?.userId}` ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Rimuovi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Esci dal workspace</DialogTitle>
            <DialogDescription>
              Non avrai più accesso a {workspace.name}. Un admin dovrà invitarti di nuovo per
              rientrare.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleLeave} disabled={actionLoading === 'leave'}>
              {actionLoading === 'leave' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Esci'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Impostazioni workspace</DialogTitle>
            <DialogDescription>Modifica il nome o elimina il workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Nome workspace</Label>
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>

            <PlanGate feature="workspaceAccent" plan={plan}>
              <div className="space-y-2">
                <Label htmlFor="ws-accent">Accent color</Label>
                <div className="flex gap-2">
                  <Input
                    id="ws-accent"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                </div>
              </div>
            </PlanGate>

            <PlanGate feature="privateWorkspace" plan={plan}>
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">Workspace privato</p>
                  <p className="text-xs text-muted-foreground">Visibile solo su invito</p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </PlanGate>

            <PlanGate feature="apiKeys" plan={plan}>
              <div className="space-y-3 rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium">API Keys</p>
                {newApiKey && (
                  <div className="rounded-lg bg-primary/10 p-2 text-xs break-all">
                    Nuova chiave (copiala ora): <code>{newApiKey}</code>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome chiave"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                  />
                  <Button size="sm" onClick={handleCreateApiKey} disabled={!!actionLoading}>
                    Crea
                  </Button>
                </div>
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-xs">
                    <span>
                      {k.name} · {k.key_prefix}...
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 h-7"
                      onClick={() =>
                        runAction(`revoke-${k.id}`, async () => {
                          await revokeApiKey(workspace.id, k.id);
                          await loadApiKeys();
                        })
                      }
                    >
                      Revoca
                    </Button>
                  </div>
                ))}
              </div>
            </PlanGate>

            {isOwner && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-sm font-medium text-red-400 mb-2">Zona pericolosa</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Elimina definitivamente il workspace, tutte le board e i task associati.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    setSettingsOpen(false);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Elimina workspace
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={actionLoading === 'settings' || !workspaceName.trim()}
              className="bg-teal-500 hover:bg-teal-400 text-zinc-950"
            >
              {actionLoading === 'settings' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Elimina workspace</DialogTitle>
            <DialogDescription>
              Questa azione è irreversibile. Tutti i dati di &quot;{workspace.name}&quot; verranno
              eliminati.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === 'delete'}>
              {actionLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
