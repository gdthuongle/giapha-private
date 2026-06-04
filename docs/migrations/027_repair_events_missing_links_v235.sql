CREATE OR REPLACE FUNCTION public.repair_events_missing_person_links()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_inserted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_role public.event_role_enum;
BEGIN
  FOR v_row IN
    SELECT
      e.id AS event_id,
      e.legacy_person_id AS person_id,
      e.type
    FROM public.events e
    WHERE e.deleted_at IS NULL
      AND e.legacy_person_id IS NOT NULL
      AND e.type IN ('birth', 'death')
      AND NOT EXISTS (
        SELECT 1
        FROM public.person_events pe
        WHERE pe.event_id = e.id
          AND pe.person_id = e.legacy_person_id
      )
  LOOP
    BEGIN
      v_role :=
        CASE
          WHEN v_row.type = 'death'
          THEN 'deceased'::public.event_role_enum
          ELSE 'principal'::public.event_role_enum
        END;

      INSERT INTO public.person_events (
        person_id,
        event_id,
        role
      )
      VALUES (
        v_row.person_id,
        v_row.event_id,
        v_role
      )
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'event_id', v_row.event_id,
          'person_id', v_row.person_id,
          'error', SQLERRM,
          'code', SQLSTATE
        )
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_errors) = 0,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_events_missing_person_links()
TO authenticated;
