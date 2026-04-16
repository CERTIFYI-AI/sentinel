-- 006_core.sql: Organizations, User Profiles, Audit Log, Helpers
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, domain text UNIQUE, industry text, size text,
  country text DEFAULT \'US\', settings jsonb DEFAULT \'{}\',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  org_id uuid REFERENCES organizations ON DELETE CASCADE,
  full_name text NOT NULL,
  role text DEFAULT \'viewer\',
  department text, avatar_url text, mfa_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION get_org_id() RETURNS uuid AS $$
  SELECT org_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid, actor_id uuid, actor_name text, actor_role text,
  module text NOT NULL, entity_type text NOT NULL, entity_id uuid,
  entity_name text, action text NOT NULL,
  old_values jsonb, new_values jsonb, created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
