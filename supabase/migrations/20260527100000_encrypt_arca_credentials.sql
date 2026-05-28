create extension if not exists pgcrypto;

create or replace function public.encrypt_arca_credential(
  plaintext text,
  encryption_key text
)
returns text
language sql
stable
strict
set search_path = public, extensions
as $$
  select encode(
    pgp_sym_encrypt(
      plaintext,
      encryption_key,
      'cipher-algo=aes256, compress-algo=0'
    ),
    'base64'
  );
$$;

create or replace function public.decrypt_arca_credential(
  ciphertext text,
  encryption_key text
)
returns text
language sql
stable
strict
set search_path = public, extensions
as $$
  select pgp_sym_decrypt(decode(ciphertext, 'base64'), encryption_key);
$$;

revoke all on function public.encrypt_arca_credential(text, text)
from public, anon, authenticated;

revoke all on function public.decrypt_arca_credential(text, text)
from public, anon, authenticated;

grant execute on function public.encrypt_arca_credential(text, text)
to service_role;

grant execute on function public.decrypt_arca_credential(text, text)
to service_role;

comment on function public.encrypt_arca_credential(text, text)
is 'Encrypts ARCA credential material with pgcrypto using a backend-provided master key.';

comment on function public.decrypt_arca_credential(text, text)
is 'Decrypts ARCA credential material with pgcrypto using a backend-provided master key.';

comment on column public.user_arca_credentials.certificate
is 'Encrypted ARCA certificate payload. Stored as pgcrypto ciphertext encoded in base64 by the backend.';

comment on column public.user_arca_credentials.private_key
is 'Encrypted ARCA private key payload. Stored as pgcrypto ciphertext encoded in base64 by the backend.';
