import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClientIp, hashIp } from '@/lib/privacy/ip';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data } = await supabase
      .from('profiles')
      .select('analytics_opt_out, marketing_opt_out, ip_tracking_opt_out')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ preferences: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const body = (await request.json()) as {
      analytics_opt_out?: boolean;
      marketing_opt_out?: boolean;
      ip_tracking_opt_out?: boolean;
    };

    const ip = getClientIp(request);
    const ipHash = ip ? hashIp(ip) : null;

    const { data, error } = await supabase.rpc('upsert_privacy_preferences', {
      p_user_id: user.id,
      p_ip_hash: ipHash,
      p_analytics_opt_out: body.analytics_opt_out ?? true,
      p_marketing_opt_out: body.marketing_opt_out ?? true,
      p_ip_tracking_opt_out: body.ip_tracking_opt_out ?? true,
      p_source: 'settings',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const response = NextResponse.json({ ok: true, id: data });
    if (body.ip_tracking_opt_out || body.analytics_opt_out) {
      response.cookies.set('tw_privacy', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
