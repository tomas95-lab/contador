-- payments: queries por usuario ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_payments_user_date
ON public.payments(user_id, date DESC);

-- invoices: queries por usuario ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_invoices_user_date
ON public.invoices(user_id, issue_date DESC);

-- assistant_messages: historial por usuario
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_date
ON public.assistant_messages(user_id, created_at ASC);

-- risk_alerts: alertas activas por usuario
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_resolved
ON public.risk_alerts(user_id, is_resolved);

-- foreign_clients: clientes por usuario
CREATE INDEX IF NOT EXISTS idx_foreign_clients_user
ON public.foreign_clients(user_id);
