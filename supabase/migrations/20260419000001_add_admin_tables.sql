-- Add admin tables for audit logs and settings
-- AgriBank Express

-- Admin Audit Logs (tracks all admin actions)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  action text NOT NULL,  -- 'add_balance', 'freeze', etc.
  target_user_id uuid REFERENCES auth.users(id),
  target_email text,
  amount bigint DEFAULT 0,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin logs viewable by service role" ON public.admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX admin_audit_logs_admin_idx ON public.admin_audit_logs(admin_id);
CREATE INDEX admin_audit_logs_target_idx ON public.admin_audit_logs(target_user_id);
CREATE INDEX admin_audit_logs_created_idx ON public.admin_audit_logs(created_at DESC);

-- Global Settings (maintenance mode etc.)
CREATE TABLE IF NOT EXISTS public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings service role only" ON public.global_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Init settings
INSERT INTO public.global_settings (key, value, description) VALUES
('maintenance_mode', 'false', 'Disable all user transactions'),
('new_registrations', 'true', 'Allow new user signups'),
('test_mode', 'true', 'Unlimited admin permissions')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for all admin actions';
COMMENT ON TABLE public.global_settings IS 'Global system configuration';
