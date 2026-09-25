-- Ejecutar después de 023_padrinos_en_simpatizantes.sql. No elimina datos.
-- Gestores y digitadores (public.users) también tienen su ficha en public.simpatizantes
-- con su rol. Como el padrino, su ficha puede no tener líder.
begin;

-- La trazabilidad admite fichas sin líder para padrinos, gestores y digitadores.
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
  if new.lider_id is null then
    if new.rol not in ('padrino', 'gestor', 'digitador') then
      raise exception 'Selecciona un líder para el simpatizante.' using errcode = '23514';
    end if;
    select jsonb_build_object(
      'registradoPor', jsonb_build_object('id', actor.id, 'nombre', actor.nombre, 'rol', actor.rol),
      'lider', null, 'padrino', null, 'fecha', new.creado_en
    ) into origen from public.users actor where actor.id = new.creado_por;
    new.trazabilidad := origen;
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

-- Crea (o marca) la ficha de una cuenta con rol padrino, gestor o digitador.
-- Sin cédula no puede tener ficha.
create or replace function private.usuario_asegurar_ficha(p public.users)
returns void language plpgsql security definer set search_path = '' as $$
declare nom record; correo text;
begin
  if p.rol not in ('padrino', 'gestor', 'digitador') then return; end if;
  if p.cedula is null or p.cedula !~ '^[0-9]{6,10}$' then return; end if;
  update public.simpatizantes set rol = p.rol where cedula = p.cedula and rol = 'simpatizante';
  if exists (select 1 from public.simpatizantes where cedula = p.cedula) then return; end if;
  select * into nom from private.partir_nombre(p.nombre);
  select lower(email) into correo from auth.users where id = p.id;
  insert into public.simpatizantes (nombres, apellidos, cedula, telefono, correo, direccion, barrio, rol, creado_por)
  values (nom.nombres, nom.apellidos, p.cedula,
    case when length(regexp_replace(coalesce(p.celular, ''), '[^0-9]', '', 'g')) between 7 and 15 then p.celular end,
    correo, left(p.direccion, 300), left(p.barrio, 150), p.rol, p.id);
end;
$$;
revoke all on function private.usuario_asegurar_ficha(public.users) from public, anon, authenticated;

create or replace function private.users_padrino_ficha()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.usuario_asegurar_ficha(new);
  return new;
end;
$$;

-- Gestores y digitadores existentes.
select private.usuario_asegurar_ficha(u) from public.users u where u.rol in ('gestor', 'digitador');

notify pgrst, 'reload schema';
commit;
