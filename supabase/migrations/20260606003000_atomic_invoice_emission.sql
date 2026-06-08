alter table public.payments
drop constraint if exists payments_invoice_status_check;

alter table public.payments
add constraint payments_invoice_status_check
check (invoice_status in ('facturado', 'pendiente', 'emitiendo'));

create unique index if not exists invoices_user_payment_issued_idx
on public.invoices (user_id, payment_id)
where payment_id is not null and status = 'issued';

alter table public.invoices
add column if not exists currency_id text not null default 'PES',
add column if not exists exchange_rate numeric(14, 6) not null default 1,
add column if not exists amount_ars numeric(14, 2);

update public.invoices
set amount_ars = amount
where amount_ars is null;

alter table public.invoices
alter column amount_ars set not null;

create or replace function public.persist_emitted_invoice_and_mark_payment(
  p_user_id uuid,
  p_payment_id uuid,
  p_invoice_type text,
  p_point_of_sale integer,
  p_number text,
  p_issue_date date,
  p_client text,
  p_description text,
  p_amount numeric,
  p_currency_id text,
  p_exchange_rate numeric,
  p_amount_ars numeric,
  p_cae text,
  p_cae_expires_at date,
  p_status text,
  p_receiver_cuit text
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_invoice public.invoices;
  target_payment public.payments;
begin
  if p_payment_id is not null then
    select *
    into target_payment
    from public.payments
    where id = p_payment_id
      and user_id = p_user_id
    for update;

    if not found then
      raise exception 'El cobro indicado no existe o no pertenece al usuario.'
        using errcode = 'P0001';
    end if;

    if target_payment.invoice_status = 'facturado' then
      raise exception 'Ese cobro ya fue marcado como facturado.'
        using errcode = 'P0001';
    end if;

    if target_payment.invoice_status <> 'emitiendo' then
      raise exception 'Ese cobro no está bloqueado para emisión.'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.invoices (
    user_id,
    payment_id,
    invoice_type,
    point_of_sale,
    number,
    issue_date,
    client,
    description,
    amount,
    currency_id,
    exchange_rate,
    amount_ars,
    cae,
    cae_expires_at,
    status
  )
  values (
    p_user_id,
    p_payment_id,
    p_invoice_type,
    p_point_of_sale,
    p_number,
    p_issue_date,
    p_client,
    p_description,
    p_amount,
    p_currency_id,
    p_exchange_rate,
    p_amount_ars,
    p_cae,
    p_cae_expires_at,
    p_status
  )
  on conflict (user_id, invoice_type, point_of_sale, number)
  do update set
    payment_id = excluded.payment_id,
    issue_date = excluded.issue_date,
    client = excluded.client,
    description = excluded.description,
    amount = excluded.amount,
    currency_id = excluded.currency_id,
    exchange_rate = excluded.exchange_rate,
    amount_ars = excluded.amount_ars,
    cae = excluded.cae,
    cae_expires_at = excluded.cae_expires_at,
    status = excluded.status
  returning * into saved_invoice;

  if p_payment_id is not null then
    update public.payments
    set
      invoice_status = 'facturado',
      invoice_type = case
        when p_invoice_type = 'Factura E' then 'E'
        else 'C'
      end,
      point_of_sale = p_point_of_sale,
      cae = p_cae,
      receiver_cuit = nullif(p_receiver_cuit, '')
    where id = p_payment_id
      and user_id = p_user_id;
  end if;

  return saved_invoice;
end;
$$;

revoke all on function public.persist_emitted_invoice_and_mark_payment(
  uuid,
  uuid,
  text,
  integer,
  text,
  date,
  text,
  text,
  numeric,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.persist_emitted_invoice_and_mark_payment(
  uuid,
  uuid,
  text,
  integer,
  text,
  date,
  text,
  text,
  numeric,
  text,
  numeric,
  numeric,
  text,
  date,
  text,
  text
) to service_role;
