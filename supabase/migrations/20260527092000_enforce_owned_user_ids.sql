delete from public.invoices
where user_id is null;

delete from public.payments
where user_id is null;

delete from public.assistant_messages
where user_id is null;

alter table public.payments
alter column user_id set not null;

alter table public.invoices
alter column user_id set not null;

alter table public.assistant_messages
alter column user_id set not null;
