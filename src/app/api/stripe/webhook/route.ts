import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import {
  syncProfilePlan,
  resolvePlanFromMetadata,
} from '@/lib/stripe/sync-plan';
import { createServiceClient } from '@/lib/supabase/server';
import type { PlanTier } from '@/lib/database.types';

function getSubscriptionPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const webhookSupabase = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = resolvePlanFromMetadata(
          session.metadata?.plan,
          session.metadata?.price_id
        );

        if (userId && plan) {
          await syncProfilePlan(
            {
              userId,
              plan,
              stripeCustomerId:
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id,
              stripeSubscriptionId:
                typeof session.subscription === 'string'
                  ? session.subscription
                  : session.subscription?.id ?? null,
            },
            { supabase: webhookSupabase }
          );
          console.info(`Plan synced via webhook: user=${userId} plan=${plan}`);
        } else {
          console.warn('checkout.session.completed missing userId or plan', {
            userId,
            metadata: session.metadata,
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const priceId = getSubscriptionPriceId(subscription);
        const isActive =
          subscription.status === 'active' || subscription.status === 'trialing';

        const plan: PlanTier =
          isActive
            ? resolvePlanFromMetadata(subscription.metadata?.plan, priceId) || 'free'
            : 'free';

        if (userId) {
          await syncProfilePlan(
            {
              userId,
              plan,
              stripeSubscriptionId: isActive ? subscription.id : null,
              stripePriceId: isActive ? priceId : null,
            },
            { supabase: webhookSupabase }
          );
          console.info(`Subscription synced: user=${userId} plan=${plan} status=${subscription.status}`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
