-- TaskWave - Initial Schema

CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'business');
CREATE TYPE member_role AS ENUM ('admin', 'member');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE notification_type AS ENUM ('assigned', 'moved', 'commented');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan plan_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  position INTEGER NOT NULL DEFAULT 0,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: check workspace membership
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: get workspace_id from board
CREATE OR REPLACE FUNCTION board_workspace_id(b_id UUID)
RETURNS UUID AS $$
  SELECT workspace_id FROM boards WHERE id = b_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get workspace_id from column
CREATE OR REPLACE FUNCTION column_workspace_id(c_id UUID)
RETURNS UUID AS $$
  SELECT b.workspace_id FROM columns c
  JOIN boards b ON b.id = c.board_id
  WHERE c.id = c_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get workspace_id from task
CREATE OR REPLACE FUNCTION task_workspace_id(t_id UUID)
RETURNS UUID AS $$
  SELECT b.workspace_id FROM tasks t
  JOIN columns c ON c.id = t.column_id
  JOIN boards b ON b.id = c.board_id
  WHERE t.id = t_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can view other profiles in shared workspaces" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

-- Workspaces policies
CREATE POLICY "Members can view workspaces" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins can update workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Owners can delete workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Workspace members policies
CREATE POLICY "Members can view workspace members" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can add members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspace_members.workspace_id
        AND user_id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can remove members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid() AND wm.role = 'admin'
    )
  );

-- Boards policies
CREATE POLICY "Members can view boards" ON boards
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create boards" ON boards
  FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "Members can update boards" ON boards
  FOR UPDATE USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can delete boards" ON boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = boards.workspace_id
        AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Columns policies
CREATE POLICY "Members can view columns" ON columns
  FOR SELECT USING (is_workspace_member(board_workspace_id(board_id)));

CREATE POLICY "Members can manage columns" ON columns
  FOR ALL USING (is_workspace_member(board_workspace_id(board_id)));

-- Tasks policies
CREATE POLICY "Members can view tasks" ON tasks
  FOR SELECT USING (is_workspace_member(task_workspace_id(id)));

CREATE POLICY "Members can manage tasks" ON tasks
  FOR ALL USING (is_workspace_member(task_workspace_id(id)));

-- Comments policies
CREATE POLICY "Members can view comments" ON comments
  FOR SELECT USING (is_workspace_member(task_workspace_id(task_id)));

CREATE POLICY "Members can create comments" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND is_workspace_member(task_workspace_id(task_id))
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
