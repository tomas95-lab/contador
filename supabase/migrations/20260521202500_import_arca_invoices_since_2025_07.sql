do $$
declare
  target_user_id uuid;
  user_count integer;
begin
  select count(*) into user_count from auth.users;

  if user_count <> 1 then
    raise exception 'Expected exactly one Supabase auth user, found %. Set target_user_id explicitly before running this import.', user_count;
  end if;

  select id into target_user_id
  from auth.users
  order by created_at
  limit 1;

  insert into public.payments (
    date,
    amount,
    client,
    description,
    method,
    invoice_status,
    user_id,
    source,
    invoice_type,
    point_of_sale,
    cae,
    receiver_cuit
  )
  values
    (
      '2025-07-02',
      500000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000009 - CAE 00000000000001',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000001',
      '00000000000'
    ),
    (
      '2025-08-31',
      1000000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000010 - CAE 00000000000002',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000002',
      '00000000000'
    ),
    (
      '2026-01-09',
      900000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000011 - CAE 00000000000003',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000003',
      '00000000000'
    ),
    (
      '2026-03-05',
      900000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000012 - CAE 00000000000004',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000004',
      '00000000000'
    ),
    (
      '2026-04-02',
      1000000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000013 - CAE 00000000000005',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000005',
      '00000000000'
    ),
    (
      '2026-05-18',
      2000000,
      'Cliente ARCA',
      'Factura C historica ARCA PV 2 Nro 00000014 - CAE 00000000000006',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '00000000000006',
      '00000000000'
    )
  on conflict (source, invoice_type, point_of_sale, cae) where cae is not null
  do update set
    date = excluded.date,
    amount = excluded.amount,
    client = excluded.client,
    description = excluded.description,
    method = excluded.method,
    invoice_status = excluded.invoice_status,
    user_id = excluded.user_id,
    receiver_cuit = excluded.receiver_cuit;
end $$;
