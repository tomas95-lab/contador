alter table public.user_arca_credentials
add column if not exists arca_environment text not null default 'production';

alter table public.user_arca_credentials
drop constraint if exists user_arca_credentials_arca_environment_check;

alter table public.user_arca_credentials
add constraint user_arca_credentials_arca_environment_check
check (arca_environment in ('homologacion', 'production'));

alter table public.user_arca_credentials
drop constraint if exists user_arca_credentials_user_id_key;

create unique index if not exists user_arca_credentials_user_environment_idx
on public.user_arca_credentials (user_id, arca_environment);
