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

alter table public.risk_alerts enable row level security;

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
