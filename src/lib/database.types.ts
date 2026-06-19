export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanTier = 'free' | 'pro' | 'business';
export type MemberRole = 'admin' | 'member';
export type TaskPriority = 'low' | 'medium' | 'high';
export type NotificationType = 'assigned' | 'moved' | 'commented';

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
      boards: TableDef<
        {
          id: string;
          workspace_id: string;
          name: string;
          description: string;
          created_at: string;
          updated_at: string;
        },
        { workspace_id: string; name: string; description?: string },
        { name?: string; description?: string; updated_at?: string }
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
        },
        {
          column_id?: string;
          title?: string;
          description?: string;
          assignee_id?: string | null;
          priority?: TaskPriority;
          position?: number;
          due_date?: string | null;
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
          read: boolean;
          created_at: string;
        },
        { user_id: string; type: NotificationType; task_id?: string | null; read?: boolean },
        { read?: boolean }
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
        Args: {
          p_workspace_id: string;
          p_email: string;
        };
        Returns: undefined;
      };
      remove_workspace_member: {
        Args: {
          p_workspace_id: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      update_workspace_member_role: {
        Args: {
          p_workspace_id: string;
          p_user_id: string;
          p_role: MemberRole;
        };
        Returns: undefined;
      };
      leave_workspace: {
        Args: {
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      delete_workspace: {
        Args: {
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      is_workspace_admin: {
        Args: {
          ws_id: string;
          u_id?: string;
        };
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_workspace_id: string;
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_metadata?: Json;
        };
        Returns: string;
      };
      validate_api_key: {
        Args: { p_key_hash: string };
        Returns: { user_id: string; workspace_id: string | null }[];
      };
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
        }
      >;
    }
  >;
}
