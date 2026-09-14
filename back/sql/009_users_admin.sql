-- Metadatos adicionales para el módulo de Gestión de Padrinos (cédula y sector).
-- Ejecutar después de 001_users.sql.
begin;

alter table public.users add column if not exists cedula text
  check (cedula is null or cedula ~ '^[0-9]{6,10}$');
alter table public.users add column if not exists sector text
  check (sector is null or length(sector) <= 200);

create unique index if not exists users_cedula_unique on public.users (cedula) where cedula is not null;

notify pgrst, 'reload schema';
commit;
