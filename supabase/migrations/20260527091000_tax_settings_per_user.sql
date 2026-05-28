alter table public.tax_settings
add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  order by created_at
  limit 1;

  if target_user_id is not null then
    update public.tax_settings
    set user_id = target_user_id
    where user_id is null;
  else
    delete from public.tax_settings
    where user_id is null;
  end if;
end $$;

alter table public.tax_settings
alter column user_id set not null;

alter table public.tax_settings
drop constraint if exists tax_settings_pkey;

alter table public.tax_settings
add constraint tax_settings_pkey primary key (user_id, id);

alter table public.tax_settings enable row level security;

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
