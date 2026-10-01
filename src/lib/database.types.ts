export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTier = 'free' | 'pro' | 'business';
export type MemberRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type TaskPriority = 'low' | 'medium' | 'high';
export type NotificationType = 'assigned' | 'moved' | 'commented' | 'invited';

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: PlanTier;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          notify_email: boolean;
          notify_assigned: boolean;
          notify_comments: boolean;
          notify_moves: boolean;
          analytics_opt_out: boolean;
          marketing_opt_out: boolean;
          ip_tracking_opt_out: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: PlanTier;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
        },
        {
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: PlanTier;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          notify_email?: boolean;
          notify_assigned?: boolean;
          notify_comments?: boolean;
          notify_moves?: boolean;
          analytics_opt_out?: boolean;
          marketing_opt_out?: boolean;
          ip_tracking_opt_out?: boolean;
          updated_at?: string;
        }
      >;
      workspaces: TableDef<
        {
          id: string;
          name: string;
          description: string;
          owner_id: string;
          is_private: boolean;
          accent_color: string | null;
          created_at: string;
          updated_at: string;
        },
        { name: string; description?: string; owner_id: string; is_private?: boolean; accent_color?: string | null },
        { name?: string; description?: string; is_private?: boolean; accent_color?: string | null; updated_at?: string }
      >;
      workspace_members: TableDef<
        {
          id: string;
          workspace_id: string;
          user_id: string;
          role: MemberRole;
          joined_at: string;
        },
        { workspace_id: string; user_id: string; role?: MemberRole },
        { role?: MemberRole }
      >;
      workspace_invitations: TableDef<
        {
          id: string;
          workspace_id: string;
          email: string;
          user_id: string | null;
          invited_by: string;
          token: string;
          status: InvitationStatus;
          role: MemberRole;
          expires_at: string;
          created_at: string;
          responded_at: string | null;
        },
        {
          workspace_id: string;
          email: string;
          user_id?: string | null;
          invited_by: string;
          token?: string;
          status?: InvitationStatus;
          role?: MemberRole;
          expires_at?: string;
        },
        {
          status?: InvitationStatus;
          user_id?: string | null;
          responded_at?: string | null;
        }
      >;
      boards: TableDef<
        {
          id: string;
          workspace_id: string;
          name: string;
          description: string;
          default_view: string;
          created_at: string;
          updated_at: string;
        },
        { workspace_id: string; name: string; description?: string; default_view?: string },
        { name?: string; description?: string; default_view?: string; updated_at?: string }
      >;
      columns: TableDef<
        {
          id: string;
          board_id: string;
          name: string;
          position: number;
          created_at: string;
        },
        { board_id: string; name: string; position?: number },
        { name?: string; position?: number }
      >;
      tasks: TableDef<
        {
          id: string;
          column_id: string;
          title: string;
          description: string;
          assignee_id: string | null;
          priority: TaskPriority;
          position: number;
          due_date: string | null;
          created_by_id: string | null;
          search_vector: unknown;
          recurrence_rule: string | null;
          recurrence_end_date: string | null;
          parent_task_id: string | null;
          reminder_at: string | null;
          checklist: Json;
          tags: string[];
          estimated_hours: number | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          column_id: string;
          title: string;
          description?: string;
          assignee_id?: string | null;
          priority?: TaskPriority;
          position?: number;
          due_date?: string | null;
          created_by_id?: string | null;
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          parent_task_id?: string | null;
          reminder_at?: string | null;
          checklist?: Json;
          tags?: string[];
          estimated_hours?: number | null;
        },
        {
          column_id?: string;
          title?: string;
          description?: string;
          assignee_id?: string | null;
          priority?: TaskPriority;
          position?: number;
          due_date?: string | null;
          recurrence_rule?: string | null;
          recurrence_end_date?: string | null;
          parent_task_id?: string | null;
          reminder_at?: string | null;
          checklist?: Json;
          tags?: string[];
          estimated_hours?: number | null;
          completed_at?: string | null;
          completed_by?: string | null;
          updated_at?: string;
        }
      >;
      comments: TableDef<
        {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
        },
        { task_id: string; user_id: string; content: string },
        { content?: string }
      >;
      notifications: TableDef<
        {
          id: string;
          user_id: string;
          type: NotificationType;
          task_id: string | null;
          title: string | null;
          message: string | null;
          workspace_id: string | null;
          read: boolean;
          created_at: string;
        },
        {
          user_id: string;
          type: NotificationType;
          task_id?: string | null;
          title?: string | null;
          message?: string | null;
          workspace_id?: string | null;
          read?: boolean;
        },
        { read?: boolean; title?: string | null; message?: string | null }
      >;
      privacy_preferences: TableDef<
        {
          id: string;
          user_id: string | null;
          ip_hash: string | null;
          analytics_opt_out: boolean;
          marketing_opt_out: boolean;
          ip_tracking_opt_out: boolean;
          source: string;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          user_id?: string | null;
          ip_hash?: string | null;
          analytics_opt_out?: boolean;
          marketing_opt_out?: boolean;
          ip_tracking_opt_out?: boolean;
          source?: string;
          verified_at?: string | null;
        },
        {
          ip_hash?: string | null;
          analytics_opt_out?: boolean;
          marketing_opt_out?: boolean;
          ip_tracking_opt_out?: boolean;
          source?: string;
          verified_at?: string | null;
          updated_at?: string;
        }
      >;
      privacy_requests: TableDef<
        {
          id: string;
          user_id: string | null;
          email: string;
          request_type: 'opt_out' | 'export' | 'delete';
          status: 'pending' | 'verified' | 'completed' | 'cancelled';
          token: string;
          ip_hash: string | null;
          metadata: Json;
          created_at: string;
          completed_at: string | null;
        },
        {
          email: string;
          request_type: 'opt_out' | 'export' | 'delete';
          user_id?: string | null;
          status?: 'pending' | 'verified' | 'completed' | 'cancelled';
          token?: string;
          ip_hash?: string | null;
          metadata?: Json;
          completed_at?: string | null;
        },
        {
          status?: 'pending' | 'verified' | 'completed' | 'cancelled';
          metadata?: Json;
          completed_at?: string | null;
        }
      >;
      step_up_otp_challenges: TableDef<
        {
          id: string;
          user_id: string;
          code_hash: string;
          expires_at: string;
          created_at: string;
        },
        { user_id: string; code_hash: string; expires_at: string },
        Record<string, never>
      >;
      workspace_webhooks: TableDef<
        {
          id: string;
          workspace_id: string;
          url: string;
          secret: string;
          events: string[];
          active: boolean;
          created_by: string;
          created_at: string;
        },
        {
          workspace_id: string;
          url: string;
          secret?: string;
          events?: string[];
          active?: boolean;
          created_by: string;
        },
        { url?: string; events?: string[]; active?: boolean }
      >;
      task_custom_fields: TableDef<
        {
          id: string;
          workspace_id: string;
          name: string;
          field_type: 'text' | 'number' | 'select';
          options: Json;
          created_at: string;
        },
        {
          workspace_id: string;
          name: string;
          field_type?: 'text' | 'number' | 'select';
          options?: Json;
        },
        { name?: string; field_type?: 'text' | 'number' | 'select'; options?: Json }
      >;
      task_custom_values: TableDef<
        {
          id: string;
          task_id: string;
          field_id: string;
          value: string | null;
        },
        { task_id: string; field_id: string; value?: string | null },
        { value?: string | null }
      >;
      task_attachments: TableDef<
        {
          id: string;
          task_id: string;
          uploaded_by: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string | null;
          created_at: string;
        },
        {
          task_id: string;
          uploaded_by: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type?: string | null;
        },
        Record<string, never>
      >;
      audit_log: TableDef<
        {
          id: string;
          workspace_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        },
        {
          workspace_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
        },
        Record<string, never>
      >;
      api_keys: TableDef<
        {
          id: string;
          user_id: string;
          workspace_id: string | null;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at: string | null;
          created_at: string;
        },
        {
          user_id: string;
          workspace_id?: string | null;
          name: string;
          key_prefix: string;
          key_hash: string;
        },
        { last_used_at?: string | null }
      >;
      board_guest_links: TableDef<
        {
          id: string;
          board_id: string;
          token: string;
          created_by: string;
          expires_at: string | null;
          created_at: string;
        },
        {
          board_id: string;
          token: string;
          created_by: string;
          expires_at?: string | null;
        },
        { expires_at?: string | null }
      >;
      // New tables
      saved_filters: TableDef<
        {
          id: string;
          user_id: string;
          workspace_id: string;
          name: string;
          filter_config: Json;
          created_at: string;
          updated_at: string;
        },
        { user_id: string; workspace_id: string; name: string; filter_config?: Json },
        { name?: string; filter_config?: Json; updated_at?: string }
      >;
      labels: TableDef<
        {
          id: string;
          workspace_id: string;
          name: string;
          color: string;
          created_at: string;
        },
        { workspace_id: string; name: string; color?: string },
        { name?: string; color?: string }
      >;
      task_labels: TableDef<
        { task_id: string; label_id: string },
        { task_id: string; label_id: string },
        Record<string, never>
      >;
      task_dependencies: TableDef<
        {
          id: string;
          task_id: string;
          depends_on_id: string;
          dep_type: string;
          created_at: string;
        },
        { task_id: string; depends_on_id: string; dep_type?: string },
        Record<string, never>
      >;
      goals: TableDef<
        {
          id: string;
          workspace_id: string;
          title: string;
          description: string;
          type: 'objective' | 'key_result';
          parent_id: string | null;
          target_value: number;
          current_value: number;
          unit: string;
          progress: number;
          status: 'active' | 'completed' | 'cancelled' | 'archived';
          owner_id: string | null;
          due_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          workspace_id: string;
          title: string;
          description?: string;
          type?: 'objective' | 'key_result';
          parent_id?: string | null;
          target_value?: number;
          current_value?: number;
          unit?: string;
          owner_id?: string | null;
          due_date?: string | null;
          created_by: string;
        },
        {
          title?: string;
          description?: string;
          target_value?: number;
          current_value?: number;
          status?: 'active' | 'completed' | 'cancelled' | 'archived';
          owner_id?: string | null;
          due_date?: string | null;
          updated_at?: string;
        }
      >;
      task_goals: TableDef<
        { goal_id: string; task_id: string; created_at: string },
        { goal_id: string; task_id: string },
        Record<string, never>
      >;
      time_entries: TableDef<
        {
          id: string;
          task_id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          description: string;
          is_running: boolean;
          created_at: string;
        },
        {
          task_id: string;
          user_id: string;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          description?: string;
          is_running?: boolean;
        },
        {
          ended_at?: string | null;
          duration_seconds?: number | null;
          description?: string;
          is_running?: boolean;
        }
      >;
      automation_rules: TableDef<
        {
          id: string;
          workspace_id: string;
          name: string;
          trigger_event: string;
          conditions: Json;
          actions: Json;
          enabled: boolean;
          created_by: string;
          last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          workspace_id: string;
          name: string;
          trigger_event: string;
          conditions?: Json;
          actions?: Json;
          enabled?: boolean;
          created_by: string;
        },
        {
          name?: string;
          trigger_event?: string;
          conditions?: Json;
          actions?: Json;
          enabled?: boolean;
          last_triggered_at?: string | null;
          updated_at?: string;
        }
      >;
      git_connections: TableDef<
        {
          id: string;
          workspace_id: string;
          provider: string;
          repo_full_name: string;
          access_token_encrypted: string;
          webhook_secret: string | null;
          webhook_id: string | null;
          created_by: string;
          created_at: string;
        },
        {
          workspace_id: string;
          provider: string;
          repo_full_name: string;
          access_token_encrypted: string;
          webhook_secret?: string | null;
          webhook_id?: string | null;
          created_by: string;
        },
        Record<string, never>
      >;
      git_events: TableDef<
        {
          id: string;
          connection_id: string;
          event_type: string;
          branch_name: string | null;
          pr_number: number | null;
          pr_title: string | null;
          pr_status: string | null;
          commit_sha: string | null;
          payload: Json;
          created_at: string;
        },
        {
          connection_id: string;
          event_type: string;
          branch_name?: string | null;
          pr_number?: number | null;
          pr_title?: string | null;
          pr_status?: string | null;
          commit_sha?: string | null;
          payload?: Json;
        },
        Record<string, never>
      >;
      task_branch_links: TableDef<
        {
          id: string;
          task_id: string;
          connection_id: string;
          branch_name: string;
          pr_number: number | null;
          pr_status: string;
          created_at: string;
        },
        { task_id: string; connection_id: string; branch_name: string; pr_number?: number | null; pr_status?: string },
        { pr_number?: number | null; pr_status?: string }
      >;
      published_templates: TableDef<
        {
          id: string;
          name: string;
          description: string;
          category: string;
          tags: string[];
          icon: string;
          board_config: Json;
          author_id: string;
          downloads: number;
          is_verified: boolean;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          name: string;
          description?: string;
          category?: string;
          tags?: string[];
          icon?: string;
          board_config: Json;
          author_id: string;
          is_verified?: boolean;
          is_public?: boolean;
        },
        {
          name?: string;
          description?: string;
          category?: string;
          tags?: string[];
          icon?: string;
          board_config?: Json;
          is_verified?: boolean;
          is_public?: boolean;
          downloads?: number;
          updated_at?: string;
        }
      >;
      ai_interactions: TableDef<
        {
          id: string;
          user_id: string;
          workspace_id: string | null;
          feature: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          latency_ms: number | null;
          created_at: string;
        },
        {
          user_id: string;
          workspace_id?: string | null;
          feature: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number | null;
        },
        Record<string, never>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      sync_profile_plan: {
        Args: {
          p_user_id: string;
          p_plan: PlanTier;
          p_stripe_customer_id?: string | null;
          p_stripe_subscription_id?: string | null;
          p_stripe_price_id?: string | null;
          p_webhook_secret?: string | null;
        };
        Returns: Json;
      };
      invite_member_by_email: {
        Args: { p_workspace_id: string; p_email: string };
        Returns: Json;
      };
      get_invitation_by_token: { Args: { p_token: string }; Returns: Json };
      accept_workspace_invitation: { Args: { p_token: string }; Returns: Json };
      decline_workspace_invitation: { Args: { p_token: string }; Returns: undefined };
      cancel_workspace_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      remove_workspace_member: { Args: { p_workspace_id: string; p_user_id: string }; Returns: undefined };
      update_workspace_member_role: { Args: { p_workspace_id: string; p_user_id: string; p_role: MemberRole }; Returns: undefined };
      leave_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      delete_workspace: { Args: { p_workspace_id: string }; Returns: undefined };
      is_workspace_admin: { Args: { ws_id: string; u_id?: string }; Returns: boolean };
      log_audit_event: {
        Args: { p_workspace_id: string; p_action: string; p_entity_type: string; p_entity_id?: string | null; p_metadata?: Json };
        Returns: string;
      };
      validate_api_key: { Args: { p_key_hash: string }; Returns: { user_id: string; workspace_id: string | null }[] };
      create_notification: {
        Args: {
          p_user_id: string; p_type: NotificationType; p_title: string; p_message: string;
          p_task_id?: string | null; p_workspace_id?: string | null;
        };
        Returns: string;
      };
      upsert_privacy_preferences: {
        Args: { p_user_id: string; p_ip_hash?: string | null; p_analytics_opt_out?: boolean; p_marketing_opt_out?: boolean; p_ip_tracking_opt_out?: boolean; p_source?: string };
        Returns: string;
      };
      upsert_privacy_by_ip_hash: {
        Args: { p_ip_hash: string; p_analytics_opt_out?: boolean; p_marketing_opt_out?: boolean; p_ip_tracking_opt_out?: boolean; p_source?: string };
        Returns: string;
      };
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined };
      search_workspace_tasks: {
        Args: {
          p_workspace_id: string; p_query: string; p_priority?: string; p_assignee_id?: string;
          p_due_before?: string; p_due_after?: string; p_limit?: number;
        };
        Returns: {
          task_id: string; task_title: string; task_description: string; task_priority: string;
          task_due_date: string; task_position: number; column_id: string; column_name: string;
          board_id: string; board_name: string; assignee_id: string; assignee_name: string; rank: number;
        }[];
      };
      generate_next_recurrence: { Args: { p_task_id: string }; Returns: string };
      execute_automation_rules: {
        Args: { p_workspace_id: string; p_trigger_event: string; p_task_id: string; p_context?: Json };
        Returns: string[];
      };
      check_ai_usage_limit: { Args: { p_user_id: string; p_limit?: number; p_window?: string }; Returns: boolean };
      get_ai_daily_limit: { Args: { p_user_id: string }; Returns: number };
      increment_template_downloads: { Args: { p_template_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type Board = Database['public']['Tables']['boards']['Row'];
export type Column = Database['public']['Tables']['columns']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type TaskAttachment = Database['public']['Tables']['task_attachments']['Row'];
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row'];
export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type BoardGuestLink = Database['public']['Tables']['board_guest_links']['Row'];
export type WorkspaceWebhook = Database['public']['Tables']['workspace_webhooks']['Row'];
export type PrivacyPreference = Database['public']['Tables']['privacy_preferences']['Row'];
export type PrivacyRequest = Database['public']['Tables']['privacy_requests']['Row'];
export type TaskCustomField = Database['public']['Tables']['task_custom_fields']['Row'];
export type TaskCustomValue = Database['public']['Tables']['task_custom_values']['Row'];
export type SavedFilter = Database['public']['Tables']['saved_filters']['Row'];
export type Label = Database['public']['Tables']['labels']['Row'];
export type TaskDependency = Database['public']['Tables']['task_dependencies']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type TaskGoal = Database['public']['Tables']['task_goals']['Row'];
export type TimeEntry = Database['public']['Tables']['time_entries']['Row'];
export type AutomationRule = Database['public']['Tables']['automation_rules']['Row'];
export type GitConnection = Database['public']['Tables']['git_connections']['Row'];
export type GitEvent = Database['public']['Tables']['git_events']['Row'];
export type TaskBranchLink = Database['public']['Tables']['task_branch_links']['Row'];
export type PublishedTemplate = Database['public']['Tables']['published_templates']['Row'];
export type AiInteraction = Database['public']['Tables']['ai_interactions']['Row'];

export interface WorkspaceWithMembers extends Workspace {
  members: Array<WorkspaceMember & { profile: Profile }>;
}

export interface BoardWithColumns extends Board {
  columns: Array<
    Column & {
      tasks: Array<
        Task & {
          assignee?: Profile | null;
          comments?: Array<Comment & { profile?: Profile }>;
          attachments?: TaskAttachment[];
          dependencies?: TaskDependency[];
          labels?: Label[];
        }
      >;
    }
  >;
}

export interface GoalWithChildren extends Goal {
  children: Goal[];
  tasks: Task[];
}

export interface TaskWithDetails extends Task {
  assignee?: Profile | null;
  comments?: Array<Comment & { profile?: Profile }>;
  attachments?: TaskAttachment[];
  dependencies?: Array<TaskDependency & { dependsOn?: Task }>;
  labels?: Label[];
  timeEntries?: TimeEntry[];
  branchLinks?: TaskBranchLink[];
}
