CREATE TABLE IF NOT EXISTS public.arca_invoice_emission_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('C', 'E')),
  point_of_sale integer NOT NULL CHECK (point_of_sale > 0),
  invoice_number integer CHECK (invoice_number > 0),
  client_name text,
  receiver_cuit text,
  authorized_result jsonb,
  status text NOT NULL CHECK (
    status IN ('prepared', 'authorized', 'persisted', 'failed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, payment_id)
);

CREATE INDEX IF NOT EXISTS arca_invoice_emission_attempts_pending_idx
ON public.arca_invoice_emission_attempts (user_id, status, updated_at DESC)
WHERE status IN ('prepared', 'authorized');

ALTER TABLE public.arca_invoice_emission_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.arca_invoice_emission_attempts
FROM public, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.arca_invoice_emission_attempts
TO service_role;
