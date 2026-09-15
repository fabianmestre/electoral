-- Ejecutar después de 015_campos_padrinos.sql en el SQL Editor de Supabase.
-- Carga los ocho padrinos de la imagen; no borra los padrinos existentes.
-- Contraseña inicial = cédula, solo para las nuevas cuentas con correo.
-- DOLMAR no tiene correo, contraseña ni identidad de acceso.
-- Reejecutar actualiza datos de contacto y conserva las contraseñas existentes.
begin;
create extension if not exists pgcrypto with schema extensions;
lock table public.users in share row exclusive mode;
do $$
declare cuenta record; nuevo_id uuid; codigo text; perfil record; correo_actual text;
begin
  for cuenta in select * from (values
    (45, 'EDUARDO ARAUJO SOLORZANO', '77030163', '3186232854', 'CALLE 33A # 4E-25', 'LOS MAYALES', 'eduardoaraujocp@hotmail.com'),
    (96, 'FERNEY SUAREZ QUINTERO', '77097123', '3228360462', 'MZ D CASA 28', 'URB. VERONA', 'ney_fer07@hotmail.com'),
    (101, 'DOLMAR RENGIFO', '77094716', '3172591550', 'CALLE 12 # 27 35', 'ENEAL', null::text),
    (108, 'CRISTIAN CONEO FUENTES', '7570606', '3104128551', 'DIAGONAL 20 # 24-86', 'FUNDADORES', 'cristianconeo1@gmail.com'),
    (134, 'JORGE MARIO CELEDON SUAREZ', '1065578567', '3006719709', 'CASA D11', 'CONJUNTO C. SENDEROS DE LA SIERRA', 'jorgemar86@hotmail.com'),
    (136, 'KAREN DAZA DAZA', '39463412', '3012178947', 'MZ D CASA 25', 'CONJUNTO C. MIRADOR DE LA SIERRA 1', 'karendazadaza@gmail.com'),
    (140, 'FREDY CALIXTO MAESTRE SANCHEZ', '77011137', '3166274619', 'APTO 203B', 'CONJUNTO C. LOFT 38', 'fredyms47@hotmail.com'),
    (143, 'FREDYS GAMEZ LOBO', '12594117', '3008000877', 'APTO 201', 'EDIFICIO JAMAPA', 'fredys_gamez@hotmail.com')
  ) as filas(numero, nombre, cedula, celular, direccion, barrio, email)
  loop
    nuevo_id := null;
    select u.* into perfil from public.users u where u.cedula = cuenta.cedula;
    if found then
      if perfil.rol <> 'padrino' then raise exception 'La cédula % pertenece a otro rol.', cuenta.cedula; end if;
      nuevo_id := perfil.id;
      select a.email into correo_actual from auth.users a where a.id = nuevo_id;
      if lower(correo_actual) is distinct from cuenta.email then
        raise exception 'La cédula % tiene otro correo. Revisa antes de cambiar su acceso.', cuenta.cedula;
      end if;
    elsif cuenta.email is not null then
      select a.id into nuevo_id from auth.users a where lower(a.email) = cuenta.email;
      if found then
        raise exception 'El correo % ya existe con otra cuenta. No se modificó ninguna cuenta.', cuenta.email;
      end if;
    end if;
    if nuevo_id is null then
      if cuenta.email is null then
        select (public.crear_padrino_sin_correo(jsonb_build_object('nombre', cuenta.nombre, 'cedula', cuenta.cedula,
          'numero', cuenta.numero, 'celular', cuenta.celular, 'direccion', cuenta.direccion, 'barrio', cuenta.barrio))->>'id')::uuid into nuevo_id;
      else
        nuevo_id := gen_random_uuid();
        select 'P' || (coalesce(max(substring(padrino_id from 2)::integer), 0) + 1)
          into codigo from public.users where padrino_id ~ '^P[0-9]+$';
        insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
          email_change_token_new, email_change, email_change_token_current, reauthentication_token, is_sso_user, is_anonymous)
        values ('00000000-0000-0000-0000-000000000000', nuevo_id, 'authenticated', 'authenticated', cuenta.email,
          extensions.crypt(cuenta.cedula, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('nombre', cuenta.nombre), now(), now(), '', '', '', '', '', '', false, false);
        insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
        values (gen_random_uuid(), nuevo_id::text, nuevo_id,
          jsonb_build_object('sub', nuevo_id::text, 'email', cuenta.email, 'email_verified', true), 'email', now(), now());
        insert into public.users (id, nombre, cedula, rol, padrino_id, activo)
          values (nuevo_id, cuenta.nombre, cuenta.cedula, 'padrino', codigo, true);
      end if;
    end if;
    update public.users set nombre = cuenta.nombre, numero = cuenta.numero, celular = cuenta.celular,
      direccion = cuenta.direccion, barrio = cuenta.barrio where id = nuevo_id;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
select u.numero, u.nombre, u.cedula, u.celular, u.direccion, u.barrio, a.email,
  (a.email is not null and a.encrypted_password is not null and u.activo) as tiene_acceso
from public.users u join auth.users a on a.id = u.id
where u.cedula in ('77030163', '77097123', '77094716', '7570606', '1065578567', '39463412', '77011137', '12594117')
order by u.numero;
