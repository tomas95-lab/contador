drop policy if exists "user_arca_credentials_insert" on public.user_arca_credentials;
drop policy if exists "user_arca_credentials_update" on public.user_arca_credentials;
drop policy if exists "user_arca_credentials_delete" on public.user_arca_credentials;

revoke insert, update, delete on table public.user_arca_credentials from anon;
revoke insert, update, delete on table public.user_arca_credentials from authenticated;

grant select on table public.user_arca_credentials to authenticated;
grant select, insert, update, delete on table public.user_arca_credentials to service_role;

drop policy if exists "user_arca_credentials_select" on public.user_arca_credentials;

create policy "user_arca_credentials_select"
on public.user_arca_credentials for select
to authenticated
using (auth.uid() = user_id);
