alter table public.payments
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.invoices
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.assistant_messages
add column if not exists user_id uuid references auth.users(id) on delete cascade;

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
