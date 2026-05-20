create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  number text not null,
  invoice_type text not null default 'Factura C',
  point_of_sale integer not null default 1,
  issue_date date not null default current_date,
  client text not null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  cae text,
  cae_expires_at date,
  status text not null default 'draft' check (status in ('draft', 'issued')),
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete" on public.invoices;

create policy "invoices_select"
on public.invoices for select
to anon, authenticated
using (true);

create policy "invoices_insert"
on public.invoices for insert
to anon, authenticated
with check (true);

create policy "invoices_update"
on public.invoices for update
to anon, authenticated
using (true)
with check (true);

create policy "invoices_delete"
on public.invoices for delete
to anon, authenticated
using (true);
