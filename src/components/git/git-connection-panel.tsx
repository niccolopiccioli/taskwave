'use client';

import { useState, useEffect } from 'react';
import { Github, GitBranch, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface GitConnectionPanelProps {
  workspaceId: string;
  plan: string;
}

interface GitConnection {
  id: string;
  provider: string;
  repo_full_name: string;
  webhook_id: string | null;
  created_at: string;
}

interface GitEvent {
  id: string;
  event_type: string;
  branch_name: string | null;
  pr_number: number | null;
  pr_title: string | null;
  pr_status: string | null;
  created_at: string;
}

const providerIcons: Record<string, typeof Github> = {
  github: Github,
  gitlab: Github,
};

export function GitConnectionPanel({ workspaceId }: GitConnectionPanelProps) {
  const { toast } = useToast();
  const [connections, setConnections] = useState<GitConnection[]>([]);
  const [events] = useState<Record<string, GitEvent[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workspaces/${workspaceId}/git`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setConnections(data.connections || []);
      })
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleConnectGitHub = () => {
    window.location.href = `/api/git/auth?workspaceId=${workspaceId}`;
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Disconnettere questo repository?')) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/git/${connectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      toast({ title: 'Repository disconnesso' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: e instanceof Error ? e.message : 'Disconnessione fallita',
      });
    }
  };

  const eventTypeLabels: Record<string, string> = {
    push: 'Push',
    pull_request_opened: 'PR aperta',
    pull_request_closed: 'PR chiusa',
    pull_request_merged: 'PR mergiata',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnectGitHub}
        className="gap-2"
      >
        <Github className="h-4 w-4" />
        Connetti GitHub
      </Button>

      {connections.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nessun repository connesso. Connetti GitHub per sincronizzare branch e PR.
        </p>
      )}

      {connections.map((conn) => {
        const Icon = providerIcons[conn.provider] || Github;
        const connEvents = events[conn.id] || [];
        return (
          <Card key={conn.id} className="border-border/60">
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-teal-400" />
                  <CardTitle className="text-sm font-medium">{conn.repo_full_name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300"
                  onClick={() => handleDisconnect(conn.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-1.5">
              {connEvents.length > 0 ? (
                <ScrollArea className="max-h-32">
                  {connEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center gap-2 text-xs py-1 border-l-2 border-teal-500/20 pl-2"
                    >
                      <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">
                        {evt.branch_name && (
                          <span className="font-mono text-[10px]">{evt.branch_name}</span>
                        )}
                        {evt.pr_number && (
                          <span>PR #{evt.pr_number}{evt.pr_title ? ` - ${evt.pr_title}` : ''}</span>
                        )}
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                        {eventTypeLabels[evt.event_type] || evt.event_type}
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Nessuna attività recente
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
