-- v2.5.5 Wedding/admin events support
-- Add the wedding value to the Event Model enum when the project uses public.event_type.
-- Safe to run repeatedly.

DO $$
BEGIN
  IF to_regtype('public.event_type') IS NOT NULL THEN
    ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'wedding';
  END IF;
END $$;
