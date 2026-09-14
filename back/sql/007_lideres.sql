-- Líderes de campaña (entidad propia, sin cuenta de acceso). Cada líder pertenece a un
-- padrino (public.users con rol='padrino'). Ejecutar después de 001_users.sql y 002_seed_users.sql.
begin;

create table public.lideres (
  id uuid primary key default gen_random_uuid(),
  nombres text not null check (length(trim(nombres)) between 1 and 100),
  apellidos text not null check (length(trim(apellidos)) between 1 and 100),
  cedula text not null check (cedula ~ '^[0-9]{6,10}$'),
  meta integer not null default 0 check (meta >= 0),
  territorio text check (territorio is null or length(territorio) <= 200),
  rol_dia_e text not null default 'Votante' check (rol_dia_e in ('Votante', 'Conductor', 'Testigo electoral')),
  padrino_id uuid not null references public.users(id),
  activo boolean not null default true,
  creado_por uuid not null default auth.uid() references public.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index lideres_cedula_unique on public.lideres (cedula);
create index lideres_padrino_idx on public.lideres (padrino_id);

create schema if not exists private;

create function private.lideres_actualizar_tiempo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
revoke all on function private.lideres_actualizar_tiempo() from public, anon, authenticated;

create trigger lideres_tiempos
before update on public.lideres
for each row execute function private.lideres_actualizar_tiempo();

alter table public.lideres enable row level security;

revoke all on public.lideres from anon, authenticated;
grant select, delete on public.lideres to authenticated;
grant insert (nombres, apellidos, cedula, meta, territorio, rol_dia_e, padrino_id, activo)
  on public.lideres to authenticated;
grant update (nombres, apellidos, cedula, meta, territorio, rol_dia_e, padrino_id, activo)
  on public.lideres to authenticated;
grant all on public.lideres to service_role;

-- Admin: todos los líderes. Padrino: únicamente los suyos (padrino_id = su propia cuenta).
create policy lideres_leer on public.lideres for select to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or (u.rol = 'padrino' and lideres.padrino_id = (select auth.uid())))
));

create policy lideres_crear on public.lideres for insert to authenticated
with check (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or (u.rol = 'padrino' and lideres.padrino_id = (select auth.uid())))
));

create policy lideres_editar on public.lideres for update to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or (u.rol = 'padrino' and lideres.padrino_id = (select auth.uid())))
))
with check (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or (u.rol = 'padrino' and lideres.padrino_id = (select auth.uid())))
));

create policy lideres_eliminar on public.lideres for delete to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or (u.rol = 'padrino' and lideres.padrino_id = (select auth.uid())))
));

-- Semilla: los 7 líderes originales de la demo, repartidos entre los 3 padrinos sembrados
-- en 002_seed_users.sql. Se omite si ese script no se ha ejecutado (no hay padrinos aún).
insert into public.lideres (nombres, apellidos, cedula, meta, territorio, rol_dia_e, padrino_id, creado_por)
select v.nombres, v.apellidos, v.cedula, v.meta, v.territorio, v.rol_dia_e, u.id, u.id
from (values
  ('Andrés', 'Ramírez Muñoz', '1111000001', 70, 'Comunas 1–2 · Valledupar', 'Testigo electoral', 'P1'),
  ('María Fernanda', 'Gómez Ríos', '1111000002', 70, 'Comunas 3–4 · Valledupar', 'Votante', 'P1'),
  ('Carlos Alberto', 'Torres Mejía', '1111000003', 65, 'Comunas 5–6 · Valledupar', 'Conductor', 'P2'),
  ('Diana Marcela', 'Rojas Díaz', '1111000004', 50, 'Corregimientos Norte (Patillal, La Mina, Los Venados)', 'Votante', 'P2'),
  ('Jorge Enrique', 'Mejía Soto', '1111000005', 50, 'Corregimientos Sur (Guacoche, Valencia de Jesús, Aguas Blancas)', 'Conductor', 'P3'),
  ('Patricia', 'Salas Orozco', '1111000006', 40, 'Zona mixta · control débil', 'Votante', 'P3'),
  ('Candidato', 'Entorno', '1111000000', 30, 'Entorno del candidato (amigos y familiares)', 'Votante', 'P1')
) as v(nombres, apellidos, cedula, meta, territorio, rol_dia_e, padrino_codigo)
join public.users u on u.padrino_id = v.padrino_codigo and u.rol = 'padrino'
on conflict (cedula) do nothing;

notify pgrst, 'reload schema';
commit;
