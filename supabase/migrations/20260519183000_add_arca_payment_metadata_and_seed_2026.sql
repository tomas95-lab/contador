alter table public.payments
add column if not exists source text not null default 'manual',
add column if not exists invoice_type text,
add column if not exists point_of_sale integer,
add column if not exists cae text,
add column if not exists receiver_cuit text;

create unique index if not exists payments_arca_historical_cae_idx
on public.payments (source, invoice_type, point_of_sale, cae)
where cae is not null;

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
      '2026-05-18',
      2000000,
      'CUIT 30711998612',
      'Factura C historica ARCA PV 2 - CAE 86206100858726',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '86206100858726',
      '30711998612'
    ),
    (
      '2026-04-02',
      1000000,
      'CUIT 30711998612',
      'Factura C historica ARCA PV 2 - CAE 86140043571398',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '86140043571398',
      '30711998612'
    ),
    (
      '2026-03-05',
      900000,
      'CUIT 30711998612',
      'Factura C historica ARCA PV 2 - CAE 86106370512794',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '86106370512794',
      '30711998612'
    ),
    (
      '2026-01-09',
      900000,
      'CUIT 30711998612',
      'Factura C historica ARCA PV 2 - CAE 76024185196388',
      'Transferencia',
      'facturado',
      target_user_id,
      'arca_historical',
      'C',
      2,
      '76024185196388',
      '30711998612'
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
