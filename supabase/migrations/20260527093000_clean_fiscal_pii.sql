update public.payments
set
  client = 'Cliente ARCA',
  receiver_cuit = case
    when receiver_cuit is null then null
    else '00000000000'
  end
where source = 'arca_historical';

with numbered_payments as (
  select
    id,
    lpad(
      row_number() over (
        partition by source, invoice_type, point_of_sale
        order by date, id
      )::text,
      14,
      '0'
    ) as placeholder_cae
  from public.payments
  where source = 'arca_historical'
    and cae is not null
)
update public.payments as payments
set
  cae = numbered_payments.placeholder_cae,
  description = regexp_replace(
    payments.description,
    'CAE [0-9]{14}',
    'CAE ' || numbered_payments.placeholder_cae,
    'g'
  )
from numbered_payments
where payments.id = numbered_payments.id;

update public.payments
set
  client = regexp_replace(client, 'CUIT [0-9]{11}', 'CUIT 00000000000', 'g'),
  description = regexp_replace(description, 'CUIT [0-9]{11}', 'CUIT 00000000000', 'g')
where client ~ 'CUIT [0-9]{11}'
   or description ~ 'CUIT [0-9]{11}';

with numbered_invoices as (
  select
    id,
    lpad(
      row_number() over (
        partition by invoice_type, point_of_sale
        order by issue_date, id
      )::text,
      14,
      '0'
    ) as placeholder_cae
  from public.invoices
  where cae is not null
)
update public.invoices as invoices
set
  cae = numbered_invoices.placeholder_cae,
  description = regexp_replace(
    invoices.description,
    'CAE [0-9]{14}',
    'CAE ' || numbered_invoices.placeholder_cae,
    'g'
  )
from numbered_invoices
where invoices.id = numbered_invoices.id;

update public.invoices
set
  client = regexp_replace(client, 'CUIT [0-9]{11}', 'CUIT 00000000000', 'g'),
  description = regexp_replace(description, 'CUIT [0-9]{11}', 'CUIT 00000000000', 'g')
where client ~ 'CUIT [0-9]{11}'
   or description ~ 'CUIT [0-9]{11}';
