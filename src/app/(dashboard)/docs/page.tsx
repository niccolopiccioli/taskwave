'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { Brand } from '@/components/layout/brand';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/workspaces?include=boards|members',
    description: 'REST API Business — workspace (+ boards/members opzionali)',
    auth: 'Bearer API key',
  },
  {
    method: 'GET',
    path: '/api/v1/boards/{boardId}',
    description: 'REST API Business — board con colonne e task',
    auth: 'Bearer API key',
  },
  {
    method: 'GET',
    path: '/api/v1/workspaces/{id}/members',
    description: 'REST API Business — membri workspace',
    auth: 'Bearer API key',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks/{taskId}',
    description: 'REST API Business — dettaglio task',
    auth: 'Bearer API key',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/{taskId}',
    description: 'REST API Business — aggiorna task',
    auth: 'Bearer API key',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tasks/{taskId}',
    description: 'REST API Business — elimina task',
    auth: 'Bearer API key',
  },
  {
    method: 'GET',
    path: '/api/workspaces/{id}/webhooks',
    description: 'Lista webhook outbound (Business)',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/workspaces/{id}/webhooks',
    description: 'Registra webhook su eventi task (Business)',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/tasks/{id}/events',
    description: 'Eventi task (notifiche, audit, webhook dispatch)',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/workspaces/{id}/invite',
    description: 'Invia invito email (Pro+). L\'invitato deve accettare.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/invitations/{token}',
    description: 'Dettaglio invito pending',
  },
  {
    method: 'POST',
    path: '/api/invitations/{token}',
    description: 'Accetta o rifiuta invito',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/notifications',
    description: 'Inbox notifiche utente',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/tasks/{id}/attachments',
    description: 'Upload allegato task (Pro+)',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/tasks/attachments/{id}/download',
    description: 'Download allegato (signed URL)',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/sso/status',
    description: 'Stato SSO/SAML (Business)',
  },
  {
    method: 'POST',
    path: '/api/stripe/checkout',
    description: 'Crea sessione Stripe Checkout per piano Pro o Business',
    body: { plan: 'pro' },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/stripe/portal',
    description: 'Apre il portale di fatturazione Stripe',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/stripe/webhook',
    description: 'Webhook Stripe per aggiornare il piano utente',
  },
];

const supabaseTables = [
  { name: 'profiles', description: 'Profilo utente, piano e dati Stripe' },
  { name: 'workspaces', description: 'Workspace e team' },
  { name: 'boards', description: 'Board Kanban' },
  { name: 'columns', description: 'Colonne Kanban' },
  { name: 'tasks', description: 'Task con priorità e assegnatario' },
  { name: 'notifications', description: 'Notifiche utente' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-amber-500',
  DELETE: 'bg-red-500',
};

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-2xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-[3.75rem] items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Brand href="/dashboard" size="sm" className="sm:hidden shrink-0" />
              <Brand href="/dashboard" size="md" className="hidden sm:flex shrink-0" />
              <span className="text-sm font-medium text-muted-foreground truncate hidden min-[400px]:inline">
                — Docs
              </span>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">Documentazione API</h1>
        <p className="text-muted-foreground mb-8">
          TaskWave usa Supabase per auth e dati, Stripe per i pagamenti (test mode).
        </p>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Autenticazione</h2>
          <Card className="border-border/60 bg-card/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                L&apos;autenticazione è gestita da Supabase Auth. Le sessioni sono cookie HTTP-only.
                Le route API protette verificano la sessione server-side.
              </p>
              <code className="text-xs bg-zinc-900 px-3 py-2 rounded block">
                supabase.auth.signInWithPassword({'{ email, password }'})
              </code>
            </CardContent>
          </Card>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Tabelle Supabase</h2>
          <div className="space-y-3">
            {supabaseTables.map((table) => (
              <Card key={table.name} className="border-border/60 bg-card/50">
                <CardHeader className="py-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{table.name}</Badge>
                    <CardDescription>{table.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">API Routes (Next.js)</h2>
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <Card key={endpoint.path + endpoint.method} className="border-border/60 bg-card/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge className={`${methodColors[endpoint.method]} text-white`}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    {endpoint.auth && (
                      <Badge variant="outline" className="text-xs">Auth required</Badge>
                    )}
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                {endpoint.body && (
                  <CardContent>
                    <div className="relative">
                      <pre className="text-xs bg-zinc-900 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(endpoint.body, null, 2)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(endpoint.body, null, 2), endpoint.path)
                        }
                      >
                        {copied === endpoint.path ? (
                          <Check className="h-4 w-4 text-teal-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
