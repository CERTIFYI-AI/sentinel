-- Fix 10: Custom roles and SoD rules
CREATE TABLE IF NOT EXISTS custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  name text NOT NULL,
  description text,
  base_role text DEFAULT 'viewer',
  permissions jsonb NOT NULL DEFAULT '{}',
  user_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, name)
);
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_org ON custom_roles FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS sod_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  name text NOT NULL,
  description text,
  module_a text NOT NULL,
  action_a text NOT NULL,
  module_b text NOT NULL,
  action_b text NOT NULL,
  severity text DEFAULT 'high',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sod_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY sod_rules_org ON sod_rules FOR ALL USING (org_id = get_org_id());

INSERT INTO sod_rules (org_id, name, module_a, action_a, module_b, action_b, severity) VALUES
  (get_org_id(),'Risk Create / Risk Accept','risks','create','risks','approve','critical'),
  (get_org_id(),'Model Register / Model Approve','models','create','models','approve','critical'),
  (get_org_id(),'Audit Manage / Audit Approve','audit_log','admin','compliance','approve','high'),
  (get_org_id(),'Policy Write / Policy Publish','policies','create','policies','approve','high'),
  (get_org_id(),'User Admin / Audit Log','access_control','admin','audit_log','delete','critical')
ON CONFLICT DO NOTHING;
