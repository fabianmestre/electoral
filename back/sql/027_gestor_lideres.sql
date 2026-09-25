-- Ejecutar después de 026_comunicaciones.sql. No elimina fichas.
-- Asignación gestor ↔ líderes: el gestor solo ve y completa las fichas de los
-- simpatizantes de los líderes que el admin le asigna (antes veía todas, 021).
begin;

create table if not exists public.gestor_lideres (
  gestor_id uuid not null references public.users(id) on delete cascade,
  lider_id uuid not null references public.lideres(id) on delete cascade,
  asignado_por uuid references public.users(id),
  asignado_en timestamptz not null default now(),
  primary key (gestor_id, lider_id)
);
create index if not exists gestor_lideres_lider_idx on public.gestor_lideres (lider_id);

alter table public.gestor_lideres enable row level security;
revoke all on public.gestor_lideres from anon, authenticated;
grant select on public.gestor_lideres to authenticated;
grant all on public.gestor_lideres to service_role;
-- Cada gestor consulta sus propias asignaciones; el admin las gestiona desde el backend.
create policy gestor_lideres_leer_propias on public.gestor_lideres for select to authenticated
using (gestor_id = auth.uid());

-- ¿La sesión es un gestor activo con ese líder asignado? (security definer: evita
-- depender de las políticas de gestor_lideres dentro de otras políticas).
create or replace function private.gestor_tiene_lider(lider uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gestor_lideres gl
    join public.users u on u.id = gl.gestor_id
    where gl.gestor_id = auth.uid() and gl.lider_id = lider and u.activo and u.rol = 'gestor'
  );
$$;
revoke all on function private.gestor_tiene_lider(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.gestor_tiene_lider(uuid) to authenticated;

-- Reemplaza el acceso total del gestor (021) por el acceso según asignación.
drop policy if exists gestores_leer_simpatizantes on public.simpatizantes;
drop policy if exists gestores_editar_simpatizantes on public.simpatizantes;
drop policy if exists gestores_leer_lideres on public.lideres;
drop policy if exists gestores_leer_vehiculos on public.simpatizante_vehiculos;
drop policy if exists gestores_crear_vehiculos on public.simpatizante_vehiculos;
drop policy if exists gestores_editar_vehiculos on public.simpatizante_vehiculos;
drop policy if exists gestores_eliminar_vehiculos on public.simpatizante_vehiculos;

create policy gestores_leer_simpatizantes on public.simpatizantes for select to authenticated
using (private.gestor_tiene_lider(lider_id));
create policy gestores_editar_simpatizantes on public.simpatizantes for update to authenticated
using (private.gestor_tiene_lider(lider_id))
with check (private.gestor_tiene_lider(lider_id));

create policy gestores_leer_lideres on public.lideres for select to authenticated
using (private.gestor_tiene_lider(id));

create policy gestores_leer_vehiculos on public.simpatizante_vehiculos for select to authenticated
using (exists (select 1 from public.simpatizantes s where s.id = simpatizante_id and private.gestor_tiene_lider(s.lider_id)));
create policy gestores_crear_vehiculos on public.simpatizante_vehiculos for insert to authenticated
with check (exists (select 1 from public.simpatizantes s where s.id = simpatizante_id and private.gestor_tiene_lider(s.lider_id)));
create policy gestores_editar_vehiculos on public.simpatizante_vehiculos for update to authenticated
using (exists (select 1 from public.simpatizantes s where s.id = simpatizante_id and private.gestor_tiene_lider(s.lider_id)))
with check (exists (select 1 from public.simpatizantes s where s.id = simpatizante_id and private.gestor_tiene_lider(s.lider_id)));
create policy gestores_eliminar_vehiculos on public.simpatizante_vehiculos for delete to authenticated
using (exists (select 1 from public.simpatizantes s where s.id = simpatizante_id and private.gestor_tiene_lider(s.lider_id)));

notify pgrst, 'reload schema';
commit;
