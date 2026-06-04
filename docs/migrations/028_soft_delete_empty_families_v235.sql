CREATE OR REPLACE FUNCTION public.soft_delete_empty_families()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  UPDATE public.families f
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE f.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.family_parents fp
      WHERE fp.family_id = f.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.family_children fc
      WHERE fc.family_id = f.id
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'soft_deleted', v_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_empty_families()
TO authenticated;
