-- v2.6.6: Audit RPC + event form compatibility cleanup

-- 1) Ensure event role enum values used by current forms exist.
DO $$
BEGIN
  IF to_regtype('public.event_role_enum') IS NOT NULL THEN
    ALTER TYPE public.event_role_enum ADD VALUE IF NOT EXISTS 'visibility_root';
  END IF;
END $$;


-- Ensure event enum values used by current event forms exist.
DO $$
DECLARE
  v_event_enum regtype;
BEGIN
  SELECT a.atttypid::regtype
  INTO v_event_enum
  FROM pg_attribute a
  WHERE a.attrelid = 'public.events'::regclass
    AND a.attname = 'type'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_event_enum IS NOT NULL THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', v_event_enum, 'wedding');
    EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', v_event_enum, 'death_anniversary');
  END IF;
END $$;

-- 2) Make audit_logs tolerant of both legacy trigger schema and app audit schema.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS table_name TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS changed_by UUID,
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actor_user_id UUID,
  ADD COLUMN IF NOT EXISTS actor_email TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.audit_logs
  ALTER COLUMN table_name DROP NOT NULL,
  ALTER COLUMN table_name SET DEFAULT 'system',
  ALTER COLUMN record_id DROP NOT NULL,
  ALTER COLUMN record_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN action SET DEFAULT 'unknown',
  ALTER COLUMN entity_type SET DEFAULT 'system',
  ALTER COLUMN severity SET DEFAULT 'info',
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN source SET DEFAULT 'app',
  ALTER COLUMN changed_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.audit_logs
SET table_name = COALESCE(table_name, entity_type, 'system'),
    record_id = COALESCE(record_id, gen_random_uuid()),
    action = COALESCE(action, 'unknown'),
    entity_type = COALESCE(entity_type, 'system'),
    severity = COALESCE(severity, 'info'),
    metadata = COALESCE(metadata, '{}'::jsonb),
    source = COALESCE(source, 'app'),
    changed_at = COALESCE(changed_at, created_at, now()),
    created_at = COALESCE(created_at, changed_at, now());

-- 3) Drop old generic audit trigger logs if they still exist and only create unknown noise.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS trigger_schema,
      c.relname AS table_name,
      t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%audit_logs%'
      AND pg_get_functiondef(p.oid) ILIKE '%TG_OP%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', r.trigger_name, r.trigger_schema, r.table_name);
  END LOOP;
END $$;

-- 4) Stable audit insert RPC. This is used by Server Actions and works with RLS enabled.
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action TEXT,
  p_entity_type TEXT DEFAULT 'system',
  p_entity_id TEXT DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_actor_user_id UUID DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id UUID;
  v_actor UUID;
  v_email TEXT;
  v_role TEXT;
  v_entity_type TEXT;
  v_severity TEXT;
  v_record_id UUID;
BEGIN
  v_actor := COALESCE(p_actor_user_id, auth.uid());
  v_entity_type := COALESCE(NULLIF(p_entity_type, ''), 'system');
  v_severity := COALESCE(NULLIF(p_severity, ''), 'info');

  IF v_severity NOT IN ('info', 'warning', 'danger') THEN
    v_severity := 'info';
  END IF;

  v_email := p_actor_email;
  v_role := p_actor_role;

  IF v_actor IS NOT NULL THEN
    SELECT COALESCE(v_email, u.email)
    INTO v_email
    FROM auth.users u
    WHERE u.id = v_actor;

    SELECT COALESCE(v_role, pr.role::text)
    INTO v_role
    FROM public.profiles pr
    WHERE pr.id = v_actor;
  END IF;

  BEGIN
    v_record_id := NULLIF(p_entity_id, '')::uuid;
  EXCEPTION WHEN others THEN
    v_record_id := gen_random_uuid();
  END;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    changed_by,
    old_data,
    new_data,
    source,
    changed_at,
    actor_user_id,
    actor_email,
    actor_role,
    action,
    entity_type,
    entity_id,
    entity_label,
    severity,
    metadata,
    created_at
  )
  VALUES (
    v_entity_type,
    COALESCE(v_record_id, gen_random_uuid()),
    v_actor,
    NULL,
    COALESCE(p_metadata, '{}'::jsonb),
    'app_rpc',
    now(),
    v_actor,
    v_email,
    v_role,
    COALESCE(NULLIF(p_action, ''), 'unknown'),
    v_entity_type,
    p_entity_id,
    p_entity_label,
    v_severity,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_audit_log(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, TEXT) TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert own audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read audit_logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_logs;
CREATE POLICY "Service role can manage audit logs"
ON public.audit_logs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
