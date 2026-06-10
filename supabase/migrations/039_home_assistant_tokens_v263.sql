CREATE TABLE IF NOT EXISTS public.home_assistant_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Home Assistant',
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS home_assistant_tokens_user_id_idx
  ON public.home_assistant_tokens(user_id);

CREATE INDEX IF NOT EXISTS home_assistant_tokens_active_hash_idx
  ON public.home_assistant_tokens(token_hash)
  WHERE is_active = TRUE AND revoked_at IS NULL;

ALTER TABLE public.home_assistant_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own HA tokens" ON public.home_assistant_tokens;
CREATE POLICY "Users can read own HA tokens"
ON public.home_assistant_tokens
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own HA tokens" ON public.home_assistant_tokens;
CREATE POLICY "Users can create own HA tokens"
ON public.home_assistant_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can revoke own HA tokens" ON public.home_assistant_tokens;
CREATE POLICY "Users can revoke own HA tokens"
ON public.home_assistant_tokens
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage HA tokens" ON public.home_assistant_tokens;
CREATE POLICY "Service role can manage HA tokens"
ON public.home_assistant_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_action_check;

-- Cho các action mới của Home Assistant token nếu DB còn schema audit legacy.
ALTER TABLE public.audit_logs
  ALTER COLUMN table_name DROP NOT NULL,
  ALTER COLUMN table_name SET DEFAULT 'system',
  ALTER COLUMN record_id DROP NOT NULL,
  ALTER COLUMN record_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN action SET DEFAULT 'unknown',
  ALTER COLUMN entity_type SET DEFAULT 'system',
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
