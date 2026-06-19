'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { registerSchema, RegisterInput } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/layout/brand';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-400" /></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const prefilledEmail = searchParams.get('email') || '';
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: prefilledEmail, password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (authData.session) {
        toast({
          title: 'Account creato!',
          description: 'Benvenuto in TaskWave.',
        });
        router.push(inviteToken ? `/invite/${inviteToken}` : '/dashboard');
        router.refresh();
      } else {
        toast({
          title: 'Account creato!',
          description: 'Controlla la tua email per confermare l\'account.',
        });
        router.push('/login');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Impossibile creare l\'account.';
      const friendly =
        message.includes('Database error saving new user')
          ? 'Errore nel database. Riprova tra qualche secondo.'
          : message.includes('already registered') || message.includes('already been registered')
          ? 'Questa email è già registrata. Prova ad accedere.'
          : message.includes('email_address_invalid')
          ? 'Indirizzo email non valido.'
          : message.includes('rate limit') || message.includes('over_email_send_rate_limit')
          ? 'Limite email Supabase raggiunto. Disattiva la conferma email nel dashboard Supabase (Auth → Providers → Email) oppure riprova tra circa un\'ora.'
          : message;

      toast({
        variant: 'destructive',
        title: 'Errore di registrazione',
        description: friendly,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 noise-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      <Card className="w-full max-w-md relative border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Brand href="/" size="lg" />
          </div>
          <CardTitle className="text-2xl font-display">Crea il tuo account</CardTitle>
          <CardDescription>
            {inviteToken ? 'Crea un account per accettare l\'invito al team' : 'Inizia a gestire i tuoi progetti'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Mario Rossi" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nome@azienda.it" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conferma Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-zinc-950" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione account...
                  </>
                ) : (
                  'Registrati'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Hai già un account?{' '}
            <Link href="/login" className="text-teal-400 hover:underline">
              Accedi
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
