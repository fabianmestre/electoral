-- Ejecutar después de 016_cargue_padrinos.sql. No elimina registros.
-- Los líderes existentes quedan sin acceso hasta que se les ingrese un correo.
begin;
create extension if not exists pgcrypto with schema extensions;
alter table public.users drop constraint if exists users_rol_check;
alter table public.users add constraint users_rol_check check (rol in ('admin', 'subadmin', 'padrino', 'digitador', 'lider'));
alter table public.lideres add column if not exists correo text
  check (correo is null or (length(correo) <= 254 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
alter table public.lideres add column if not exists user_id uuid unique references public.users(id) on delete set null;
create unique index if not exists lideres_correo_unique on public.lideres (lower(correo)) where correo is not null;
grant insert (correo), update (correo) on public.lideres to authenticated;

create or replace function private.lideres_sincronizar_acceso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare cuenta_id uuid;
begin
  -- La FK puede desvincular una cuenta eliminada; no recrearla durante el borrado.
  if tg_op = 'UPDATE' and old.user_id is not null and new.user_id is null then return new; end if;
  if not exists (select 1 from public.users u where u.id = new.padrino_id and u.rol = 'padrino' and u.activo) then
    raise exception 'Selecciona un padrino activo.' using errcode = '23514';
  end if;
  if new.correo is null then return new; end if;
  new.correo := lower(trim(new.correo));
  if new.user_id is null then
    cuenta_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', cuenta_id, 'authenticated', 'authenticated', new.correo,
      extensions.crypt(new.cedula, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', new.nombres || ' ' || new.apellidos), now(), now(), '', '', '', '', '', '', false, false);
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (gen_random_uuid(), cuenta_id::text, cuenta_id,
      jsonb_build_object('sub', cuenta_id::text, 'email', new.correo, 'email_verified', true), 'email', now(), now());
    insert into public.users (id, nombre, cedula, rol, activo)
      values (cuenta_id, new.nombres || ' ' || new.apellidos, new.cedula, 'lider', new.activo);
    new.user_id := cuenta_id;
  else
    update public.users set nombre = new.nombres || ' ' || new.apellidos, cedula = new.cedula, activo = new.activo
      where id = new.user_id and rol = 'lider';
    if tg_op = 'UPDATE' and new.correo is distinct from old.correo then
      update auth.users set email = new.correo, email_confirmed_at = now(), updated_at = now() where id = new.user_id;
      update auth.identities set identity_data = identity_data || jsonb_build_object('email', new.correo, 'email_verified', true), updated_at = now()
        where user_id = new.user_id and provider = 'email';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.lideres_sincronizar_acceso() from public, anon, authenticated;
drop trigger if exists lideres_sincronizar_acceso on public.lideres;
create trigger lideres_sincronizar_acceso before insert or update on public.lideres
for each row execute function private.lideres_sincronizar_acceso();

create or replace function private.lideres_eliminar_acceso()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is not null then delete from auth.users where id = old.user_id; end if;
  return old;
end;
$$;
revoke all on function private.lideres_eliminar_acceso() from public, anon, authenticated;
drop trigger if exists lideres_eliminar_acceso on public.lideres;
create trigger lideres_eliminar_acceso after delete on public.lideres
for each row execute function private.lideres_eliminar_acceso();

create policy lider_leer_ficha on public.lideres for select to authenticated
using (user_id = auth.uid() and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'lider'));
create policy lider_leer_simpatizantes on public.simpatizantes for select to authenticated
using (exists (select 1 from public.lideres l where l.id = lider_id and l.user_id = auth.uid() and l.activo));
create policy lider_crear_simpatizantes on public.simpatizantes for insert to authenticated
with check (creado_por = auth.uid() and exists (select 1 from public.lideres l where l.id = lider_id and l.user_id = auth.uid() and l.activo));
create policy lider_editar_simpatizantes on public.simpatizantes for update to authenticated
using (exists (select 1 from public.lideres l where l.id = lider_id and l.user_id = auth.uid() and l.activo))
with check (exists (select 1 from public.lideres l where l.id = lider_id and l.user_id = auth.uid() and l.activo));
create policy lider_vehiculos on public.simpatizante_vehiculos for all to authenticated
using (exists (select 1 from public.simpatizantes s join public.lideres l on l.id = s.lider_id
  where s.id = simpatizante_id and l.user_id = auth.uid() and l.activo))
with check (exists (select 1 from public.simpatizantes s join public.lideres l on l.id = s.lider_id
  where s.id = simpatizante_id and l.user_id = auth.uid() and l.activo));

create or replace function private.digitadores_proteger_voto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.users u where u.id = auth.uid() and u.rol in ('digitador', 'lider'))
    and (new.voto_registrado is distinct from old.voto_registrado or new.voto_hora is distinct from old.voto_hora) then
    raise exception 'Este rol no puede modificar el registro de voto.';
  end if;
  return new;
end;
$$;
notify pgrst, 'reload schema';
commit;
