-- Directorio de simpatizantes (Ficha Técnica). Ejecutar después de 001_users.sql.
-- No inserta datos de personas.
begin;

create table public.simpatizantes (
  id uuid primary key default gen_random_uuid(),

  -- 1 · Datos personales
  nombres text not null check (length(trim(nombres)) between 1 and 100),
  apellidos text not null check (length(trim(apellidos)) between 1 and 100),
  cedula text not null check (cedula ~ '^[0-9]{6,10}$'),
  fecha_nacimiento date not null check (fecha_nacimiento <= current_date),
  telefono text not null check (
    length(telefono) <= 30 and telefono ~ '^\+?[0-9 ()-]+$'
    and length(regexp_replace(telefono, '[^0-9]', '', 'g')) between 7 and 15
  ),
  correo text check (
    correo is null or (length(correo) <= 254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  direccion text check (direccion is null or length(direccion) <= 300),

  -- 0 · Ubicación electoral
  departamento text not null check (length(trim(departamento)) between 1 and 100),
  municipio text not null check (length(trim(municipio)) between 1 and 100),
  zona text not null check (zona in ('Urbana', 'Rural')),
  comuna text check (comuna is null or length(trim(comuna)) between 1 and 100),
  corregimiento text check (corregimiento is null or length(trim(corregimiento)) between 1 and 100),
  barrio text not null check (length(trim(barrio)) between 1 and 150),
  puesto text not null check (length(trim(puesto)) between 1 and 150),
  mesa integer not null check (mesa > 0),

  -- 2 · Caracterización social
  intereses text[] not null default '{}',
  grupos_sociales text[] not null default '{}',
  ocupacion text check (ocupacion is null or length(trim(ocupacion)) between 1 and 100),
  profesion text check (profesion is null or length(trim(profesion)) between 1 and 100),
  nivel_academico text not null default 'Bachiller'
    check (nivel_academico in ('Sin estudios', 'Primaria', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional')),
  posgrado text not null default 'Ninguno'
    check (posgrado in ('Ninguno', 'Especialización', 'Maestría', 'Doctorado')),
  observacion text check (observacion is null or length(observacion) <= 1000),

  -- 4 · Vinculación y compromiso
  lider_id uuid not null references public.users(id),
  nivel_voto text not null default 'Firme' check (nivel_voto in ('Firme', 'Indeciso', 'En Riesgo')),
  rol_dia_e text not null default 'Votante' check (rol_dia_e in ('Votante', 'Conductor', 'Testigo electoral')),

  -- 5 · Legal — Habeas Data
  habeas_data boolean not null default false,
  habeas_data_fecha timestamptz,

  creado_por uuid not null default auth.uid() references public.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint simpatizantes_sector_zona check (
    (zona = 'Urbana' and comuna is not null and corregimiento is null)
    or (zona = 'Rural' and corregimiento is not null and comuna is null)
  ),
  constraint simpatizantes_habeas_data_fecha check (
    (habeas_data and habeas_data_fecha is not null)
    or (not habeas_data and habeas_data_fecha is null)
  )
);

create unique index simpatizantes_cedula_unique on public.simpatizantes (cedula);
create index simpatizantes_lider_idx on public.simpatizantes (lider_id);
create index simpatizantes_creador_fecha_idx on public.simpatizantes (creado_por, creado_en desc, id);
create index simpatizantes_ubicacion_idx on public.simpatizantes (departamento, municipio, barrio, puesto);

-- 3 · Logística Día "E" (vehículos a disposición del simpatizante)
create table public.simpatizante_vehiculos (
  id uuid primary key default gen_random_uuid(),
  simpatizante_id uuid not null references public.simpatizantes(id) on delete cascade,
  tipo text not null check (tipo in ('Moto', 'Automóvil', 'Camioneta', 'Bus')),
  capacidad_pasajeros integer not null check (capacidad_pasajeros between 1 and 60),
  a_disposicion boolean not null default true,
  estado text not null default 'Disponible' check (estado in ('Disponible', 'En ruta', 'Completado')),
  creado_en timestamptz not null default now()
);

create index simpatizante_vehiculos_simpatizante_idx on public.simpatizante_vehiculos (simpatizante_id);

create schema if not exists private;

create function private.simpatizantes_actualizar_tiempos()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  if tg_op = 'INSERT' then
    new.habeas_data_fecha := case when new.habeas_data then now() else null end;
  elsif new.habeas_data is distinct from old.habeas_data then
    new.habeas_data_fecha := case when new.habeas_data then now() else null end;
  else
    new.habeas_data_fecha := old.habeas_data_fecha;
  end if;
  return new;
end;
$$;
revoke all on function private.simpatizantes_actualizar_tiempos() from public, anon, authenticated;

create trigger simpatizantes_tiempos
before insert or update on public.simpatizantes
for each row execute function private.simpatizantes_actualizar_tiempos();

alter table public.simpatizantes enable row level security;
alter table public.simpatizante_vehiculos enable row level security;

revoke all on public.simpatizantes from anon, authenticated;
grant select, delete on public.simpatizantes to authenticated;
grant insert (
  nombres, apellidos, cedula, fecha_nacimiento, telefono, correo, direccion,
  departamento, municipio, zona, comuna, corregimiento, barrio, puesto, mesa,
  intereses, grupos_sociales, ocupacion, profesion, nivel_academico, posgrado, observacion,
  lider_id, nivel_voto, rol_dia_e, habeas_data
) on public.simpatizantes to authenticated;
grant update (
  nombres, apellidos, cedula, fecha_nacimiento, telefono, correo, direccion,
  departamento, municipio, zona, comuna, corregimiento, barrio, puesto, mesa,
  intereses, grupos_sociales, ocupacion, profesion, nivel_academico, posgrado, observacion,
  lider_id, nivel_voto, rol_dia_e, habeas_data
) on public.simpatizantes to authenticated;
grant all on public.simpatizantes to service_role;

revoke all on public.simpatizante_vehiculos from anon, authenticated;
grant select, insert, update, delete on public.simpatizante_vehiculos to authenticated;
grant all on public.simpatizante_vehiculos to service_role;

-- Se consulta el perfil propio en users, protegido por su RLS existente.
-- Admin o permiso datos: todos los simpatizantes. Padrino: únicamente los que registró.
create policy simpatizantes_leer on public.simpatizantes for select to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy simpatizantes_crear on public.simpatizantes for insert to authenticated
with check (creado_por = (select auth.uid()) and exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol in ('admin', 'padrino') or 'datos' = any(u.permisos))
));

create policy simpatizantes_editar on public.simpatizantes for update to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
))
with check (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy simpatizantes_eliminar on public.simpatizantes for delete to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

-- Los vehículos heredan el permiso del simpatizante al que pertenecen.
create policy simpatizante_vehiculos_leer on public.simpatizante_vehiculos for select to authenticated
using (exists (
  select 1 from public.simpatizantes s where s.id = simpatizante_id and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.activo
      and (u.rol = 'admin' or 'datos' = any(u.permisos)
        or (u.rol = 'padrino' and s.creado_por = (select auth.uid())))
  )
));

create policy simpatizante_vehiculos_crear on public.simpatizante_vehiculos for insert to authenticated
with check (exists (
  select 1 from public.simpatizantes s where s.id = simpatizante_id and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.activo
      and (u.rol = 'admin' or 'datos' = any(u.permisos)
        or (u.rol = 'padrino' and s.creado_por = (select auth.uid())))
  )
));

create policy simpatizante_vehiculos_editar on public.simpatizante_vehiculos for update to authenticated
using (exists (
  select 1 from public.simpatizantes s where s.id = simpatizante_id and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.activo
      and (u.rol = 'admin' or 'datos' = any(u.permisos)
        or (u.rol = 'padrino' and s.creado_por = (select auth.uid())))
  )
))
with check (exists (
  select 1 from public.simpatizantes s where s.id = simpatizante_id and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.activo
      and (u.rol = 'admin' or 'datos' = any(u.permisos)
        or (u.rol = 'padrino' and s.creado_por = (select auth.uid())))
  )
));

create policy simpatizante_vehiculos_eliminar on public.simpatizante_vehiculos for delete to authenticated
using (exists (
  select 1 from public.simpatizantes s where s.id = simpatizante_id and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.activo
      and (u.rol = 'admin' or 'datos' = any(u.permisos)
        or (u.rol = 'padrino' and s.creado_por = (select auth.uid())))
  )
));

notify pgrst, 'reload schema';
commit;
