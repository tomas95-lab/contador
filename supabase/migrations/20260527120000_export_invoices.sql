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

alter table public.foreign_clients enable row level security;

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
