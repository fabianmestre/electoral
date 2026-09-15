-- Ejecutar después de 012_dia_e.sql. Conserva los datos existentes.
begin;
alter table public.users drop constraint if exists users_rol_check;
alter table public.users add constraint users_rol_check check (rol in ('admin', 'subadmin', 'padrino', 'digitador'));
alter table public.simpatizantes add column if not exists planilla_codigo text
  check (planilla_codigo is null or length(trim(planilla_codigo)) between 1 and 80);
create index if not exists simpatizantes_planilla_idx on public.simpatizantes (planilla_codigo, lider_id);
grant insert (planilla_codigo), update (planilla_codigo) on public.simpatizantes to authenticated;

create policy digitadores_leer_lideres on public.lideres for select to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'));

create policy digitadores_leer_simpatizantes on public.simpatizantes for select to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'));
create policy digitadores_crear_simpatizantes on public.simpatizantes for insert to authenticated
with check (creado_por = auth.uid() and planilla_codigo is not null and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador')
  and exists (select 1 from public.lideres l where l.id = lider_id and l.activo));
create policy digitadores_editar_simpatizantes on public.simpatizantes for update to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador')
  and exists (select 1 from public.lideres l where l.id = lider_id and l.activo));

-- El padrino puede consultar y corregir las fichas de sus líderes,
-- aunque las haya registrado un digitador.
create policy padrinos_leer_fichas_lideres on public.simpatizantes for select to authenticated
using (exists (select 1 from public.lideres l where l.id = lider_id and l.padrino_id = auth.uid())
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'padrino'));
create policy padrinos_editar_fichas_lideres on public.simpatizantes for update to authenticated
using (exists (select 1 from public.lideres l where l.id = lider_id and l.padrino_id = auth.uid())
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'padrino'))
with check (exists (select 1 from public.lideres l where l.id = lider_id and l.padrino_id = auth.uid())
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'padrino'));

create policy digitadores_leer_vehiculos on public.simpatizante_vehiculos for select to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'));
create policy digitadores_crear_vehiculos on public.simpatizante_vehiculos for insert to authenticated
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador')
  and exists (select 1 from public.simpatizantes s where s.id = simpatizante_id));
create policy digitadores_editar_vehiculos on public.simpatizante_vehiculos for update to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador')
  and exists (select 1 from public.simpatizantes s where s.id = simpatizante_id));
-- El guardado de una ficha reemplaza sus vehículos.
create policy digitadores_reemplazar_vehiculos on public.simpatizante_vehiculos for delete to authenticated
using (exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador'));
notify pgrst, 'reload schema';
create policy padrinos_vehiculos_fichas_lideres on public.simpatizante_vehiculos for all to authenticated
using (exists (select 1 from public.simpatizantes s join public.lideres l on l.id = s.lider_id
  where s.id = simpatizante_id and l.padrino_id = auth.uid())
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'padrino'))
with check (exists (select 1 from public.simpatizantes s join public.lideres l on l.id = s.lider_id
  where s.id = simpatizante_id and l.padrino_id = auth.uid())
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'padrino'));

-- Las columnas del día E están concedidas al rol authenticated desde 012.
-- Un digitador solo modifica la ficha, nunca el registro de voto.
create function private.digitadores_proteger_voto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.users u where u.id = auth.uid() and u.rol = 'digitador')
    and (new.voto_registrado is distinct from old.voto_registrado or new.voto_hora is distinct from old.voto_hora) then
    raise exception 'Los digitadores no pueden modificar el registro de voto.';
  end if;
  return new;
end;
$$;
revoke all on function private.digitadores_proteger_voto() from public, anon, authenticated;
create trigger digitadores_proteger_voto before update on public.simpatizantes
for each row execute function private.digitadores_proteger_voto();
commit;
