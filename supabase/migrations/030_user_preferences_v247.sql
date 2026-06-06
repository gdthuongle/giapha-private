CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  default_tree_root_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  default_dual_ancestry_root_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  default_in_law_root_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  default_stats_root_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences"
ON public.user_preferences
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
ON public.user_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
ON public.user_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_user_preferences_updated_at
ON public.user_preferences;

CREATE TRIGGER trg_touch_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_preferences_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_user_root_preferences(
  target_user_id UUID,
  p_default_tree_root_id UUID DEFAULT NULL,
  p_default_dual_ancestry_root_id UUID DEFAULT NULL,
  p_default_in_law_root_id UUID DEFAULT NULL,
  p_default_stats_root_id UUID DEFAULT NULL
)
RETURNS public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_row public.user_preferences;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.is_active = TRUE
  ) INTO v_is_admin;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF target_user_id <> auth.uid() AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO public.user_preferences (
    user_id,
    default_tree_root_id,
    default_dual_ancestry_root_id,
    default_in_law_root_id,
    default_stats_root_id
  )
  VALUES (
    target_user_id,
    p_default_tree_root_id,
    p_default_dual_ancestry_root_id,
    p_default_in_law_root_id,
    p_default_stats_root_id
  )
  ON CONFLICT (user_id) DO UPDATE SET
    default_tree_root_id = EXCLUDED.default_tree_root_id,
    default_dual_ancestry_root_id = EXCLUDED.default_dual_ancestry_root_id,
    default_in_law_root_id = EXCLUDED.default_in_law_root_id,
    default_stats_root_id = EXCLUDED.default_stats_root_id,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_root_preferences(
  UUID,
  UUID,
  UUID,
  UUID,
  UUID
) TO authenticated;
