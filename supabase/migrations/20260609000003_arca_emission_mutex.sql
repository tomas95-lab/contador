CREATE TABLE IF NOT EXISTS public.arca_emission_locks (
  lock_key text PRIMARY KEY,
  owner_token uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arca_emission_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.arca_emission_locks FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arca_emission_locks TO service_role;

CREATE OR REPLACE FUNCTION public.try_acquire_arca_emission_lock(
  p_lock_key text,
  p_owner_token uuid,
  p_lease_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired boolean;
BEGIN
  WITH acquired_lock AS (
    INSERT INTO public.arca_emission_locks (
      lock_key,
      owner_token,
      expires_at
    )
    VALUES (
      p_lock_key,
      p_owner_token,
      now() + make_interval(secs => greatest(1, least(p_lease_seconds, 600)))
    )
    ON CONFLICT (lock_key)
    DO UPDATE SET
      owner_token = excluded.owner_token,
      expires_at = excluded.expires_at
    WHERE public.arca_emission_locks.expires_at <= now()
       OR public.arca_emission_locks.owner_token = excluded.owner_token
    RETURNING true
  )
  SELECT coalesce(bool_or(true), false)
  INTO acquired
  FROM acquired_lock;

  RETURN acquired;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_arca_emission_lock(
  p_lock_key text,
  p_owner_token uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.arca_emission_locks
  WHERE lock_key = p_lock_key
    AND owner_token = p_owner_token;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_arca_emission_lock(text, uuid, integer)
FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_arca_emission_lock(text, uuid)
FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.try_acquire_arca_emission_lock(text, uuid, integer)
TO service_role;
GRANT EXECUTE ON FUNCTION public.release_arca_emission_lock(text, uuid)
TO service_role;
