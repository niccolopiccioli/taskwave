import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('id, email, status, created_at, expires_at, invited_by, token')
      .eq('workspace_id', params.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitations = (data ?? []).map((inv) => ({
      ...inv,
      invite_url: `${appUrl}/invite/${inv.token}`,
    }));

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('List invitations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
