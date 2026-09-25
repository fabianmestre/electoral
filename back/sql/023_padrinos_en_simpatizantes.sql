-- Ejecutar después de 022_rol_simpatizantes.sql. No elimina datos.
-- Los padrinos (public.users rol='padrino') también son personas que votan: cada uno
-- tiene su ficha en public.simpatizantes con rol 'padrino'. El padrino es la raíz de su
-- estructura: su ficha no tiene líder (lider_id null) ni trazabilidad de líder/padrino.
begin;

alter table public.simpatizantes alter column lider_id drop not null;

-- La trazabilidad admite fichas sin líder (padrinos): solo registra quién la creó.
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
    if new.rol is distinct from 'padrino' then
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

-- "EDUARDO ARAUJO SOLORZANO" -> nombres "EDUARDO", apellidos "ARAUJO SOLORZANO".
-- Con 4 o más palabras, las dos primeras son nombres.
create or replace function private.partir_nombre(completo text, out nombres text, out apellidos text)
language plpgsql immutable set search_path = '' as $$
declare partes text[] := regexp_split_to_array(trim(completo), '\s+'); n int; k int;
begin
  n := coalesce(array_length(partes, 1), 0);
  k := case when n >= 4 then 2 else 1 end;
  nombres := array_to_string(partes[1:k], ' ');
  apellidos := coalesce(nullif(array_to_string(partes[k + 1:n], ' '), ''), '-');
end;
$$;

-- Crea (o marca) la ficha de un padrino. Sin cédula no puede tener ficha.
create or replace function private.padrino_asegurar_ficha(p public.users)
returns void language plpgsql security definer set search_path = '' as $$
declare nom record;
begin
  if p.cedula is null or p.cedula !~ '^[0-9]{6,10}$' then return; end if;
  update public.simpatizantes set rol = 'padrino' where cedula = p.cedula and rol = 'simpatizante';
  if exists (select 1 from public.simpatizantes where cedula = p.cedula) then return; end if;
  select * into nom from private.partir_nombre(p.nombre);
  insert into public.simpatizantes (nombres, apellidos, cedula, telefono, direccion, barrio, rol, creado_por)
  values (nom.nombres, nom.apellidos, p.cedula,
    case when length(regexp_replace(coalesce(p.celular, ''), '[^0-9]', '', 'g')) between 7 and 15 then p.celular end,
    left(p.direccion, 300), left(p.barrio, 150), 'padrino', p.id);
end;
$$;

create or replace function private.users_padrino_ficha()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.rol = 'padrino' then perform private.padrino_asegurar_ficha(new); end if;
  return new;
end;
$$;
revoke all on function private.users_padrino_ficha() from public, anon, authenticated;
revoke all on function private.padrino_asegurar_ficha(public.users) from public, anon, authenticated;
drop trigger if exists users_padrino_ficha on public.users;
create trigger users_padrino_ficha after insert on public.users
for each row execute function private.users_padrino_ficha();

-- Padrinos existentes.
select private.padrino_asegurar_ficha(u) from public.users u where u.rol = 'padrino';

notify pgrst, 'reload schema';
commit;
