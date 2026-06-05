create unique index if not exists invoices_user_invoice_number_idx
on public.invoices (user_id, invoice_type, point_of_sale, number);

create unique index if not exists invoices_user_invoice_cae_idx
on public.invoices (user_id, invoice_type, point_of_sale, cae)
where cae is not null;
