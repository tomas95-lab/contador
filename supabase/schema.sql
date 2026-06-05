-- WARNING: This file is a convenience snapshot only.
-- The source of truth is supabase/migrations/. Apply migrations in order for
-- local resets and production changes.

create extension if not exists pgcrypto;

create or replace function public.encrypt_arca_credential(
  plaintext text,
  encryption_key text
)
returns text
language sql
stable
strict
set search_path = public, extensions
as $$
  select encode(
    pgp_sym_encrypt(
      plaintext,
      encryption_key,
      'cipher-algo=aes256, compress-algo=0'
    ),
    'base64'
  );
$$;

create or replace function public.decrypt_arca_credential(
  ciphertext text,
  encryption_key text
)
returns text
language sql
stable
strict
set search_path = public, extensions
as $$
  select pgp_sym_decrypt(decode(ciphertext, 'base64'), encryption_key);
$$;

revoke all on function public.encrypt_arca_credential(text, text)
from public, anon, authenticated;

revoke all on function public.decrypt_arca_credential(text, text)
from public, anon, authenticated;

grant execute on function public.encrypt_arca_credential(text, text)
to service_role;

grant execute on function public.decrypt_arca_credential(text, text)
to service_role;

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
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_arca_historical_cae_idx
on public.payments (source, invoice_type, point_of_sale, cae)
where cae is not null;

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists invoices_user_invoice_number_idx
on public.invoices (user_id, invoice_type, point_of_sale, number);

create unique index if not exists invoices_user_invoice_cae_idx
on public.invoices (user_id, invoice_type, point_of_sale, cae)
where cae is not null;

create table if not exists public.tax_settings (
  id text not null default 'default',
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null default 'A',
  annual_limit numeric(14, 2) not null,
  monthly_tax numeric(14, 2) not null,
  warning_at numeric(4, 3) not null default 0.85,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.tax_payments (
  id uuid primary key default gen_random_uuid(),
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  amount numeric(14, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, month_key)
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

create table if not exists public.user_arca_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cuit text not null,
  certificate text not null,
  private_key text not null,
  wsfe_pto_vta integer not null default 1,
  wsfex_pto_vta integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.foreign_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  country_code text not null,
  tax_id text,
  address text,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_categories (
  category_key text primary key,
  annual_limit numeric(14, 2) not null,
  monthly_tax numeric(14, 2) not null,
  warning_at numeric(4, 3) not null default 0.85,
  updated_at timestamptz not null default now()
);

create table if not exists public.risk_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  title text not null,
  message text not null,
  action_label text,
  action_url text,
  is_read boolean not null default false,
  is_resolved boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists risk_alerts_user_type_period_idx
on public.risk_alerts (user_id, type, ((metadata ->> 'period_key')))
where metadata ? 'period_key';

comment on column public.user_arca_credentials.certificate
is 'Encrypted ARCA certificate payload. Stored as pgcrypto ciphertext encoded in base64 by the backend.';

comment on column public.user_arca_credentials.private_key
is 'Encrypted ARCA private key payload. Stored as pgcrypto ciphertext encoded in base64 by the backend.';

alter table public.tax_categories enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.user_fiscal_profiles enable row level security;
alter table public.tax_settings enable row level security;
alter table public.tax_payments enable row level security;
alter table public.user_arca_credentials enable row level security;
alter table public.foreign_clients enable row level security;
alter table public.risk_alerts enable row level security;

drop policy if exists "tax_categories_select" on public.tax_categories;

create policy "tax_categories_select"
on public.tax_categories for select
to authenticated
using (true);

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
drop policy if exists "tax_settings_insert" on public.tax_settings;
drop policy if exists "tax_settings_update" on public.tax_settings;
drop policy if exists "tax_settings_delete" on public.tax_settings;

create policy "tax_settings_select"
on public.tax_settings for select
to authenticated
using (user_id = auth.uid());

create policy "tax_settings_insert"
on public.tax_settings for insert
to authenticated
with check (user_id = auth.uid());

create policy "tax_settings_update"
on public.tax_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tax_settings_delete"
on public.tax_settings for delete
to authenticated
using (user_id = auth.uid());

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

drop policy if exists "user_arca_credentials_select" on public.user_arca_credentials;
drop policy if exists "user_arca_credentials_insert" on public.user_arca_credentials;
drop policy if exists "user_arca_credentials_update" on public.user_arca_credentials;
drop policy if exists "user_arca_credentials_delete" on public.user_arca_credentials;

create policy "user_arca_credentials_select"
on public.user_arca_credentials for select
to authenticated
using (auth.uid() = user_id);

create policy "user_arca_credentials_insert"
on public.user_arca_credentials for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_arca_credentials_update"
on public.user_arca_credentials for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_arca_credentials_delete"
on public.user_arca_credentials for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "foreign_clients_select" on public.foreign_clients;
drop policy if exists "foreign_clients_insert" on public.foreign_clients;
drop policy if exists "foreign_clients_update" on public.foreign_clients;
drop policy if exists "foreign_clients_delete" on public.foreign_clients;

create policy "foreign_clients_select"
on public.foreign_clients for select
to authenticated
using (auth.uid() = user_id);

create policy "foreign_clients_insert"
on public.foreign_clients for insert
to authenticated
with check (auth.uid() = user_id);

create policy "foreign_clients_update"
on public.foreign_clients for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "foreign_clients_delete"
on public.foreign_clients for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "risk_alerts_select" on public.risk_alerts;
drop policy if exists "risk_alerts_insert" on public.risk_alerts;
drop policy if exists "risk_alerts_update" on public.risk_alerts;

create policy "risk_alerts_select"
on public.risk_alerts for select
to authenticated
using (auth.uid() = user_id);

create policy "risk_alerts_insert"
on public.risk_alerts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "risk_alerts_update"
on public.risk_alerts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
