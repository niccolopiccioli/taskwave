import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_invitation_by_token', {
      p_token: params.token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { action } = (await request.json()) as { action?: 'accept' | 'decline' };

    if (action === 'decline') {
      const { error } = await supabase.rpc('decline_workspace_invitation', {
        p_token: params.token,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, declined: true });
    }

    const { data, error } = await supabase.rpc('accept_workspace_invitation', {
      p_token: params.token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      workspaceId: (data as { workspace_id?: string })?.workspace_id,
    });
  } catch (error) {
    console.error('Invitation action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
