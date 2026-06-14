-- 045_vietnamese_unaccent_person_search.sql
-- Search người không dấu/có dấu bằng PostgreSQL unaccent.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.normalize_vietnamese_search(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      unaccent(coalesce(input, '')),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.search_persons_unaccent(
  search_text text,
  exclude_person_id uuid DEFAULT NULL,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  gender text,
  birth_year integer,
  death_year integer,
  avatar_url text,
  generation integer,
  is_in_law boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id,
    p.full_name,
    p.gender,
    p.birth_year,
    p.death_year,
    p.avatar_url,
    p.generation,
    p.is_in_law
  FROM public.persons_active p
  WHERE
    (exclude_person_id IS NULL OR p.id <> exclude_person_id)
    AND public.normalize_vietnamese_search(p.full_name)
      LIKE '%' || public.normalize_vietnamese_search(search_text) || '%'
  ORDER BY
    p.birth_year NULLS LAST,
    p.full_name ASC
  LIMIT greatest(1, least(coalesce(limit_count, 20), 100));
$$;
