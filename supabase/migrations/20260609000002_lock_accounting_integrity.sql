REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.invoices FROM authenticated;

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO service_role;

REVOKE INSERT, UPDATE ON public.payments FROM anon;
REVOKE INSERT, UPDATE ON public.payments FROM authenticated;

GRANT INSERT (
  date,
  amount,
  client,
  description,
  method,
  user_id
) ON public.payments TO authenticated;

GRANT UPDATE (
  date,
  amount,
  client,
  description,
  method
) ON public.payments TO authenticated;

DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

CREATE POLICY "payments_update"
ON public.payments FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND invoice_status = 'pendiente'
)
WITH CHECK (
  user_id = auth.uid()
  AND invoice_status = 'pendiente'
);

CREATE POLICY "payments_delete"
ON public.payments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND invoice_status = 'pendiente'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;
