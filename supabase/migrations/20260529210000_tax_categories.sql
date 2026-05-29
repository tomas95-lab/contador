create table if not exists public.tax_categories (
  category_key text primary key,
  annual_limit numeric(14, 2) not null,
  monthly_tax numeric(14, 2) not null,
  warning_at numeric(4, 3) not null default 0.85,
  updated_at timestamptz not null default now()
);

alter table public.tax_categories enable row level security;

drop policy if exists "tax_categories_select" on public.tax_categories;

create policy "tax_categories_select"
on public.tax_categories for select
to authenticated
using (true);
