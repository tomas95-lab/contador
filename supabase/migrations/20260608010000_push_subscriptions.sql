create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_active_idx
on public.push_subscriptions (user_id, active);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;

create policy "push_subscriptions_select"
on public.push_subscriptions for select
to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete on table public.push_subscriptions from anon;
revoke insert, update, delete on table public.push_subscriptions from authenticated;

grant select on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
