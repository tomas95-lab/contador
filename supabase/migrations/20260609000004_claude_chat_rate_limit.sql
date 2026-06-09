CREATE TABLE IF NOT EXISTS public.claude_chat_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.claude_chat_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.claude_chat_rate_limits FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claude_chat_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_claude_chat_rate_limit(
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
BEGIN
  INSERT INTO public.claude_chat_rate_limits (
    user_id,
    window_started_at,
    request_count
  )
  VALUES (
    p_user_id,
    now(),
    1
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    window_started_at = CASE
      WHEN public.claude_chat_rate_limits.window_started_at
        <= now() - make_interval(secs => greatest(1, p_window_seconds))
      THEN now()
      ELSE public.claude_chat_rate_limits.window_started_at
    END,
    request_count = CASE
      WHEN public.claude_chat_rate_limits.window_started_at
        <= now() - make_interval(secs => greatest(1, p_window_seconds))
      THEN 1
      ELSE public.claude_chat_rate_limits.request_count + 1
    END
  RETURNING request_count <= greatest(1, p_limit)
  INTO allowed;

  RETURN allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_claude_chat_rate_limit(uuid, integer, integer)
FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_claude_chat_rate_limit(uuid, integer, integer)
TO service_role;
