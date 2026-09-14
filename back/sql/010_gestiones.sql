-- Trazabilidad de gestiones (favores y compromisos con simpatizantes).
-- Ejecutar después de 004_simpatizantes.sql.
begin;

create table public.gestiones (
  id uuid primary key default gen_random_uuid(),
  simpatizante_id uuid references public.simpatizantes(id) on delete set null,
  fecha date not null,
  categoria text not null check (categoria in (
    'Salud', 'Empleo', 'Ayudas/Mercados', 'Recursos/Dinero', 'Trámites/Asesoría', 'Obras comunitarias'
  )),
  descripcion text not null check (length(trim(descripcion)) between 1 and 1000),
  monto numeric(12, 2) not null default 0 check (monto >= 0),
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'En Proceso', 'Resuelto', 'Cancelado')),
  responsable text not null check (length(trim(responsable)) between 1 and 150),
  creado_por uuid not null default auth.uid() references public.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index gestiones_simpatizante_idx on public.gestiones (simpatizante_id);
create index gestiones_creador_fecha_idx on public.gestiones (creado_por, fecha desc, id);

create schema if not exists private;

create function private.gestiones_actualizar_tiempo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
revoke all on function private.gestiones_actualizar_tiempo() from public, anon, authenticated;

create trigger gestiones_tiempos
before update on public.gestiones
for each row execute function private.gestiones_actualizar_tiempo();

alter table public.gestiones enable row level security;

revoke all on public.gestiones from anon, authenticated;
grant select, delete on public.gestiones to authenticated;
grant insert (simpatizante_id, fecha, categoria, descripcion, monto, estado, responsable)
  on public.gestiones to authenticated;
grant update (simpatizante_id, fecha, categoria, descripcion, monto, estado, responsable)
  on public.gestiones to authenticated;
grant all on public.gestiones to service_role;

-- Admin o permiso datos: todas las gestiones. Padrino: únicamente las que registró.
create policy gestiones_leer on public.gestiones for select to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

create policy gestiones_crear on public.gestiones for insert to authenticated
with check (creado_por = (select auth.uid()) and exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol in ('admin', 'padrino') or 'datos' = any(u.permisos))
));

create policy gestiones_editar on public.gestiones for update to authenticated
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

create policy gestiones_eliminar on public.gestiones for delete to authenticated
using (exists (
  select 1 from public.users u where u.id = (select auth.uid()) and u.activo
    and (u.rol = 'admin' or 'datos' = any(u.permisos)
      or (u.rol = 'padrino' and creado_por = (select auth.uid())))
));

notify pgrst, 'reload schema';
commit;
