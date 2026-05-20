insert into public.payments (
  date,
  amount,
  client,
  description,
  method,
  invoice_status
)
values
  ('2026-01-08', 315000, 'Clinica Norte', 'Sistema de turnos', 'Transferencia', 'facturado'),
  ('2026-02-12', 408000, 'Estudio Baires', 'Mantenimiento mensual', 'Transferencia', 'facturado'),
  ('2026-03-18', 460000, 'Noma Labs', 'Integracion CRM', 'Mercado Pago', 'facturado'),
  ('2026-04-05', 160000, 'Agencia Sur', 'Landing institucional', 'Transferencia', 'facturado'),
  ('2026-04-16', 148000, 'Mora Studio', 'Soporte ecommerce', 'Transferencia', 'facturado'),
  ('2026-04-25', 124000, 'Indigo Legal', 'Automatizacion interna', 'Efectivo', 'facturado'),
  ('2026-05-03', 185000, 'Rama Salud', 'Dashboard operativo', 'Transferencia', 'facturado'),
  ('2026-05-09', 120000, 'Cuatro Cafe', 'Sitio promocional', 'Mercado Pago', 'pendiente'),
  ('2026-05-13', 100000, 'Noma Labs', 'Horas adicionales', 'Transferencia', 'facturado'),
  ('2026-05-17', 80000, 'Estudio Baires', 'Ajustes mensuales', 'Transferencia', 'pendiente');

insert into public.assistant_messages (
  role,
  content,
  created_at
)
values
  ('assistant', 'Tenes mayo en $485.000 y el acumulado anual cerca del limite de la categoria A.', now() - interval '3 minutes'),
  ('user', 'Que deberia mirar antes de aceptar otro proyecto?', now() - interval '2 minutes'),
  ('assistant', 'Revisaria el total anual proyectado, los cobros pendientes de facturar y el margen disponible antes del proximo cierre.', now() - interval '1 minute');
