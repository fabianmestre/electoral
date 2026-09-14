-- Ejecutar una sola vez en SQL Editor, después de 001_users.sql.
-- Crea las cinco cuentas iniciales confirmadas, con contraseña 123456.
begin;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  cuenta record;
  nuevo_id uuid;
begin
  for cuenta in
    select * from (values
      ('admin@campana.com', 'Director de Campaña', 'admin', null::text, array[]::text[]),
      ('conectividad@campana.com', 'Coordinador de Conectividad', 'subadmin', null::text, array['conectividad']::text[]),
      ('padrino1@campana.com', 'Luisa Castro Peña', 'padrino', 'P1', array[]::text[]),
      ('padrino2@campana.com', 'Miguel Vargas Ortiz', 'padrino', 'P2', array[]::text[]),
      ('padrino3@campana.com', 'Carolina Jiménez Ríos', 'padrino', 'P3', array[]::text[])
    ) as cuentas(email, nombre, rol, padrino_id, permisos)
  loop
    if exists (select 1 from auth.users where lower(email) = cuenta.email) then
      raise exception 'La cuenta % ya existe. No se modificó ninguna cuenta.', cuenta.email;
    end if;
    nuevo_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      reauthentication_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', nuevo_id,
      'authenticated', 'authenticated', cuenta.email,
      extensions.crypt('123456', extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', cuenta.nombre),
      now(), now(), '', '', '', '', '', '', false, false
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at
    ) values (
      gen_random_uuid(), nuevo_id::text, nuevo_id,
      jsonb_build_object('sub', nuevo_id::text, 'email', cuenta.email, 'email_verified', true),
      'email', now(), now()
    );

    insert into public.users (id, nombre, rol, permisos, padrino_id, activo)
    values (nuevo_id, cuenta.nombre, cuenta.rol, cuenta.permisos, cuenta.padrino_id, true);
  end loop;
end $$;
commit;

select a.email, u.nombre, u.rol, u.activo
from public.users u join auth.users a on a.id = u.id
order by a.email;
