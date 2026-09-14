-- Día E: registro real de votos y bitácora de actividad de líderes.
-- Ejecutar después de 004_simpatizantes.sql y 007_lideres.sql.
begin;

alter table public.simpatizantes add column if not exists voto_registrado boolean not null default false;
alter table public.simpatizantes add column if not exists voto_hora timestamptz;

alter table public.simpatizantes add constraint simpatizantes_voto_hora check (
  (voto_registrado and voto_hora is not null) or (not voto_registrado and voto_hora is null)
);

-- Solo se pueden tocar estas dos columnas a través del endpoint dedicado de "registrar
-- voto" del backend (no forman parte del formulario normal de edición de la ficha).
grant update (voto_registrado, voto_hora) on public.simpatizantes to authenticated;

create table public.actividad_dia_e (
  id uuid primary key default gen_random_uuid(),
  lider_id uuid not null references public.lideres(id),
  tipo text not null check (tipo in ('Apertura', 'Voto', 'Nota')),
  detalle text not null check (length(trim(detalle)) between 1 and 300),
  creado_por uuid not null default auth.uid() references public.users(id),
  creado_en timestamptz not null default now()
);

create index actividad_dia_e_lider_idx on public.actividad_dia_e (lider_id);
create index actividad_dia_e_creado_idx on public.actividad_dia_e (creado_en desc);

alter table public.actividad_dia_e enable row level security;

revoke all on public.actividad_dia_e from anon, authenticated;
grant select, insert on public.actividad_dia_e to authenticated;
grant all on public.actividad_dia_e to service_role;

-- Admin o permiso datos: toda la bitácora. Padrino: únicamente lo que él mismo registró.
create policy actividad_dia_e_leer on public.actividad_dia_e for select to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy actividad_dia_e_crear on public.actividad_dia_e for insert to authenticated
with check (creado_por = (select auth.uid()) and exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol in ('admin', 'padrino') or 'datos' = any(u.permisos))
));

notify pgrst, 'reload schema';
commit;
