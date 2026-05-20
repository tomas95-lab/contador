create table if not exists public.user_fiscal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activity text not null default '',
  work_status text not null default '',
  current_category text not null default '',
  expected_monthly_income numeric(14, 2),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.user_fiscal_profiles enable row level security;

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
