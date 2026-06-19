import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database>;

export async function auditLog(
  supabase: Client,
  workspaceId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.rpc('log_audit_event', {
      p_workspace_id: workspaceId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_metadata: (metadata || {}) as Record<string, never>,
    });
  } catch (err) {
    console.warn('Audit log failed:', err);
  }
}
