-- Ejecutar en el SQL Editor de Supabase.
-- Las cuentas y contraseñas se crean mediante Supabase Auth.
begin;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) > 0),
  rol text not null default 'padrino'
    check (rol in ('admin', 'subadmin', 'padrino')),
  permisos text[] not null default '{}'
    check (permisos <@ array['conectividad', 'usuarios', 'datos', 'reset']::text[]),
  -- Identificador provisional compatible con P1, P2, P3 del frontend.
  -- Se añadirá la FK cuando creemos la tabla padrinos.
  padrino_id text,
  activo boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint users_padrino_rol check (padrino_id is null or rol = 'padrino')
);

create unique index users_padrino_id_unique
  on public.users (padrino_id) where padrino_id is not null;

alter table public.users enable row level security;

-- Cada cuenta puede consultar únicamente su propio perfil activo.
-- La gestión de roles y cuentas se realizará desde el backend autorizado.
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant all on public.users to service_role;

create policy users_leer_perfil_propio
  on public.users for select to authenticated
  using (id = (select auth.uid()) and activo = true);

commit;
