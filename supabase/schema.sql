create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  client text not null,
  description text not null,
  method text not null check (method in ('Transferencia', 'Mercado Pago', 'Efectivo')),
  invoice_status text not null default 'pendiente' check (invoice_status in ('facturado', 'pendiente')),
  source text not null default 'manual',
  invoice_type text,
  point_of_sale integer,
  cae text,
  receiver_cuit text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_arca_historical_cae_idx
on public.payments (source, invoice_type, point_of_sale, cae)
where cae is not null;

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

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
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tax_settings (
  id text primary key default 'default',
  category_key text not null default 'A',
  annual_limit numeric(14, 2) not null,
  monthly_tax numeric(14, 2) not null,
  warning_at numeric(4, 3) not null default 0.85,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_fiscal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activity text not null default '',
  work_status text not null default '',
  current_category text not null default '',
  expected_monthly_income numeric(14, 2),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.tax_settings (
  id,
  category_key,
  annual_limit,
  monthly_tax,
  warning_at
)
values (
  'default',
  'A',
  10277988,
  42387,
  0.85
)
on conflict (id) do nothing;

alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.user_fiscal_profiles enable row level security;
alter table public.tax_settings enable row level security;

drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
drop policy if exists "payments_update" on public.payments;
drop policy if exists "payments_delete" on public.payments;

create policy "payments_select"
on public.payments for select
to authenticated
using (user_id = auth.uid());

create policy "payments_insert"
on public.payments for insert
to authenticated
with check (user_id = auth.uid());

create policy "payments_update"
on public.payments for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "payments_delete"
on public.payments for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
drop policy if exists "invoices_delete" on public.invoices;

create policy "invoices_select"
on public.invoices for select
to authenticated
using (user_id = auth.uid());

create policy "invoices_insert"
on public.invoices for insert
to authenticated
with check (user_id = auth.uid());

create policy "invoices_update"
on public.invoices for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "invoices_delete"
on public.invoices for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "assistant_messages_select" on public.assistant_messages;
drop policy if exists "assistant_messages_insert" on public.assistant_messages;
drop policy if exists "assistant_messages_delete" on public.assistant_messages;

create policy "assistant_messages_select"
on public.assistant_messages for select
to authenticated
using (user_id = auth.uid());

create policy "assistant_messages_insert"
on public.assistant_messages for insert
to authenticated
with check (user_id = auth.uid());

create policy "assistant_messages_delete"
on public.assistant_messages for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_fiscal_profiles_select" on public.user_fiscal_profiles;
drop policy if exists "user_fiscal_profiles_insert" on public.user_fiscal_profiles;
drop policy if exists "user_fiscal_profiles_update" on public.user_fiscal_profiles;

create policy "user_fiscal_profiles_select"
on public.user_fiscal_profiles for select
to authenticated
using (user_id = auth.uid());

create policy "user_fiscal_profiles_insert"
on public.user_fiscal_profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_fiscal_profiles_update"
on public.user_fiscal_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tax_settings_select" on public.tax_settings;
drop policy if exists "tax_settings_update" on public.tax_settings;

create policy "tax_settings_select"
on public.tax_settings for select
to anon, authenticated
using (true);

create policy "tax_settings_update"
on public.tax_settings for update
to anon, authenticated
using (true)
with check (true);
