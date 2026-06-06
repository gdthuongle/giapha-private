-- Fix / complete audit_logs schema v2.4.9

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_email TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Nếu bảng cũ có row thiếu action/entity_type thì đặt giá trị tạm để thêm NOT NULL an toàn
UPDATE public.audit_logs
SET action = COALESCE(action, 'unknown'),
    entity_type = COALESCE(entity_type, 'unknown'),
    severity = COALESCE(severity, 'info'),
    created_at = COALESCE(created_at, now());

ALTER TABLE public.audit_logs
  ALTER COLUMN action SET NOT NULL,
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL,
  ALTER COLUMN severity SET DEFAULT 'info',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_severity_check'
      AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_severity_check
      CHECK (severity IN ('info', 'warning', 'danger'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id
ON public.audit_logs (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
ON public.audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    actor_user_id IS NULL
    OR actor_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_logs;
CREATE POLICY "Service role can manage audit logs"
ON public.audit_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');