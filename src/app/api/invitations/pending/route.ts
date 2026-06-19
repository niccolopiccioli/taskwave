import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ invitations: [] });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ invitations: [] });
    }

    const normalizedEmail = profile.email.toLowerCase();

    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('id, token, email, status, expires_at, created_at, workspace_id')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ invitations: data ?? [] });
  } catch (error) {
    console.error('Pending invitations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
