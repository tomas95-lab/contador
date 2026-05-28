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

alter table public.user_arca_credentials enable row level security;

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
