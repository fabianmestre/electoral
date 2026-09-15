-- Ejecutar después de 020_captura_reducida_lider.sql.
-- Agrega el rol Gestor, con lectura y edición de todas las fichas.
begin;

alter table public.users drop constraint if exists users_rol_check;
alter table public.users add constraint users_rol_check
  check (rol in ('admin', 'subadmin', 'padrino', 'digitador', 'lider', 'gestor'));

create policy gestores_leer_simpatizantes on public.simpatizantes for select to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));
create policy gestores_editar_simpatizantes on public.simpatizantes for update to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
)) with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));

create policy gestores_leer_lideres on public.lideres for select to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));
create policy gestores_leer_vehiculos on public.simpatizante_vehiculos for select to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));
create policy gestores_crear_vehiculos on public.simpatizante_vehiculos for insert to authenticated
with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));
create policy gestores_editar_vehiculos on public.simpatizante_vehiculos for update to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
)) with check (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));
create policy gestores_eliminar_vehiculos on public.simpatizante_vehiculos for delete to authenticated
using (exists (
  select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'gestor'
));

create or replace function private.digitadores_proteger_voto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.users u where u.id = auth.uid() and u.rol in ('digitador', 'lider', 'gestor'))
    and (new.voto_registrado is distinct from old.voto_registrado or new.voto_hora is distinct from old.voto_hora) then
    raise exception 'Este rol no puede modificar el registro de voto.';
  end if;
  return new;
end;
$$;
revoke all on function private.digitadores_proteger_voto() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
