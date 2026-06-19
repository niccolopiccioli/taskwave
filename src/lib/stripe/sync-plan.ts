import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanTier, Database } from '@/lib/database.types';
import { createServiceClient } from '@/lib/supabase/server';

const WEBHOOK_SECRET = process.env.WEBHOOK_INTERNAL_SECRET || 'taskflow_webhook_2026';

type SyncResult = { id: string; plan: PlanTier };

export async function syncProfilePlan(
  params: {
    userId: string;
    plan: PlanTier;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
  },
  options?: {
    supabase?: SupabaseClient<Database>;
    webhookSecret?: string | null;
  }
): Promise<SyncResult> {
  const supabase = options?.supabase ?? (await createServiceClient());

  const { data, error } = await supabase.rpc('sync_profile_plan', {
    p_user_id: params.userId,
    p_plan: params.plan,
    p_stripe_customer_id: params.stripeCustomerId ?? null,
    p_stripe_subscription_id: params.stripeSubscriptionId ?? null,
    p_stripe_price_id: params.stripePriceId ?? null,
    p_webhook_secret: options?.webhookSecret ?? null,
  });

  if (error) {
    console.error('syncProfilePlan failed:', error);
    throw new Error(error.message || 'Impossibile aggiornare il piano');
  }

  const result = data as SyncResult | null;
  if (!result?.id) {
    throw new Error('Risposta sincronizzazione non valida');
  }

  return result;
}

export function planFromPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business';
  return null;
}

export function resolvePlanFromMetadata(
  metadataPlan: string | null | undefined,
  priceId: string | null | undefined
): PlanTier | null {
  if (metadataPlan === 'pro' || metadataPlan === 'business' || metadataPlan === 'free') {
    return metadataPlan;
  }
  return planFromPriceId(priceId);
}

export function getWebhookSecret() {
  return WEBHOOK_SECRET;
}
