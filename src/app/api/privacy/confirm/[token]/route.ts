import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { privacyCookieHeader } from '@/lib/privacy/ip';

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const service = await createServiceClient();

    const { data: reqRow } = await service
      .from('privacy_requests')
      .select('*')
      .eq('token', params.token)
      .single();

    if (!reqRow || reqRow.status !== 'pending') {
      return NextResponse.redirect(
        new URL('/privacy/opt-out?error=invalid', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
      );
    }

    if (reqRow.ip_hash) {
      await service.rpc('upsert_privacy_by_ip_hash', {
        p_ip_hash: reqRow.ip_hash,
        p_analytics_opt_out: true,
        p_marketing_opt_out: true,
        p_ip_tracking_opt_out: true,
        p_source: 'email_confirm',
      });
    }

    if (reqRow.user_id) {
      await service.rpc('upsert_privacy_preferences', {
        p_user_id: reqRow.user_id,
        p_ip_hash: reqRow.ip_hash,
        p_analytics_opt_out: true,
        p_marketing_opt_out: true,
        p_ip_tracking_opt_out: true,
        p_source: 'email_confirm',
      });
    }

    await service
      .from('privacy_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', reqRow.id);

    const response = NextResponse.redirect(
      new URL('/privacy/opt-out?confirmed=1', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
    response.headers.append('Set-Cookie', privacyCookieHeader());
    return response;
  } catch {
    return NextResponse.redirect(
      new URL('/privacy/opt-out?error=server', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    );
  }
}
