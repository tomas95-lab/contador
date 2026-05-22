create table if not exists public.tax_payments (
  id uuid primary key default gen_random_uuid(),
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, month_key)
);

alter table public.tax_payments enable row level security;

drop policy if exists "tax_payments_select" on public.tax_payments;
drop policy if exists "tax_payments_insert" on public.tax_payments;
drop policy if exists "tax_payments_update" on public.tax_payments;
drop policy if exists "tax_payments_delete" on public.tax_payments;

create policy "tax_payments_select"
on public.tax_payments for select
to authenticated
using (user_id = auth.uid());

create policy "tax_payments_insert"
on public.tax_payments for insert
to authenticated
with check (user_id = auth.uid());

create policy "tax_payments_update"
on public.tax_payments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tax_payments_delete"
on public.tax_payments for delete
to authenticated
using (user_id = auth.uid());
