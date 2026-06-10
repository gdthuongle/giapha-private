-- v2.5.7 hotfix: event visibility root role + legacy audit column compatibility

-- Cho phép dùng person_events.role = visibility_root để gắn root hiển thị cho sự kiện admin tạo.
DO $$
BEGIN
  IF to_regtype('public.event_role_enum') IS NOT NULL THEN
    ALTER TYPE public.event_role_enum ADD VALUE IF NOT EXISTS 'visibility_root';
  END IF;
END $$;

-- Một số DB cũ có audit_logs từ trigger generic với các cột table_name/record_id NOT NULL.
-- Chuẩn hóa lại để recordAuditLog() của app luôn insert được.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS changed_by UUID,
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.audit_logs
  ALTER COLUMN table_name DROP NOT NULL,
  ALTER COLUMN table_name SET DEFAULT 'system',
  ALTER COLUMN record_id DROP NOT NULL,
  ALTER COLUMN record_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN source SET DEFAULT 'app',
  ALTER COLUMN changed_at SET DEFAULT now(),
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

UPDATE public.audit_logs
SET table_name = COALESCE(table_name, entity_type, 'system'),
    record_id = COALESCE(record_id, gen_random_uuid()),
    source = COALESCE(source, 'app'),
    changed_at = COALESCE(changed_at, created_at, now()),
    metadata = COALESCE(metadata, '{}'::jsonb);

-- Bảo đảm policy insert app-user còn tồn tại sau các lần migration.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
);
