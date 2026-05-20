update public.tax_settings
set
  category_key = 'A',
  annual_limit = 10277988,
  monthly_tax = 42387,
  warning_at = 0.85,
  updated_at = now()
where id = 'default';

insert into public.tax_settings (
  id,
  category_key,
  annual_limit,
  monthly_tax,
  warning_at
)
select
  'default',
  'A',
  10277988,
  42387,
  0.85
where not exists (
  select 1
  from public.tax_settings
  where id = 'default'
);
