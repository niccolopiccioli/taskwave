import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { syncProfilePlan, resolvePlanFromMetadata } from '@/lib/stripe/sync-plan';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId obbligatorio' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sessione non valida' }, { status: 403 });
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: 'Pagamento non completato', status: session.payment_status },
        { status: 400 }
      );
    }

    const subscription = session.subscription;
    const subscriptionId =
      typeof subscription === 'string' ? subscription : subscription?.id ?? null;

    let priceId: string | null = null;
    if (subscription && typeof subscription !== 'string') {
      priceId = subscription.items.data[0]?.price?.id ?? null;
    }

    const plan = resolvePlanFromMetadata(session.metadata?.plan, priceId);
    if (!plan || plan === 'free') {
      return NextResponse.json({ error: 'Piano non riconosciuto dalla sessione' }, { status: 400 });
    }

    const updated = await syncProfilePlan(
      {
        userId: user.id,
        plan,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
      },
      { supabase }
    );

    return NextResponse.json({
      success: true,
      plan: updated.plan,
    });
  } catch (error) {
    console.error('Sync session error:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Errore sincronizzazione piano';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
