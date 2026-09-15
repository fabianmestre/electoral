-- Ejecutar después de 017_acceso_lideres.sql. No modifica registros anteriores.
-- Guardar el origen de cada NUEVO simpatizante, calculado por la base de datos.
begin;
alter table public.simpatizantes add column if not exists trazabilidad jsonb;

create or replace function private.simpatizantes_guardar_origen()
returns trigger language plpgsql security definer set search_path = '' as $$
declare origen jsonb;
begin
  if tg_op = 'UPDATE' then
    -- El actor y las asociaciones originales nunca se reemplazan al editar.
    new.creado_por := old.creado_por;
    new.creado_en := old.creado_en;
    new.trazabilidad := old.trazabilidad;
    return new;
  end if;
  select jsonb_build_object(
    'registradoPor', jsonb_build_object('id', actor.id, 'nombre', actor.nombre, 'rol', actor.rol),
    'lider', jsonb_build_object('id', l.id, 'nombre', l.nombres || ' ' || l.apellidos),
    'padrino', jsonb_build_object('id', padrino.id, 'nombre', padrino.nombre),
    'fecha', new.creado_en
  ) into origen
  from public.lideres l
  join public.users padrino on padrino.id = l.padrino_id
  join public.users actor on actor.id = new.creado_por
  where l.id = new.lider_id;
  if origen is null then raise exception 'No se pudo determinar el origen del simpatizante.' using errcode = '23514'; end if;
  new.trazabilidad := origen;
  return new;
end;
$$;
revoke all on function private.simpatizantes_guardar_origen() from public, anon, authenticated;
drop trigger if exists simpatizantes_guardar_origen on public.simpatizantes;
create trigger simpatizantes_guardar_origen before insert or update on public.simpatizantes
for each row execute function private.simpatizantes_guardar_origen();
-- trazabilidad no se concede para INSERT/UPDATE a authenticated.
notify pgrst, 'reload schema';
commit;
