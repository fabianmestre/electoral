-- Ejecutar antes de 016_cargue_padrinos.sql. No elimina datos.
begin;
alter table public.users add column if not exists numero integer check (numero is null or numero > 0);
alter table public.users add column if not exists celular text check (celular is null or length(celular) <= 30);
alter table public.users add column if not exists direccion text check (direccion is null or length(direccion) <= 300);
alter table public.users add column if not exists barrio text check (barrio is null or length(barrio) <= 150);

-- Perfil de padrino sin credenciales de acceso. No tiene correo, contraseña ni
-- identidad email; por tanto no puede autenticarse. Conserva la FK a auth.users.
create or replace function public.crear_padrino_sin_correo(datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare nuevo_id uuid := gen_random_uuid(); codigo text;
begin
  if length(trim(coalesce(datos->>'nombre', ''))) not between 1 and 100
    or coalesce(datos->>'cedula', '') !~ '^[0-9]{6,10}$' then
    raise exception 'Nombre o cédula inválidos.' using errcode = '23514';
  end if;
  lock table public.users in share row exclusive mode;
  select 'P' || (coalesce(max(substring(padrino_id from 2)::integer), 0) + 1)
    into codigo from public.users where padrino_id ~ '^P[0-9]+$';
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, is_sso_user, is_anonymous)
  values ('00000000-0000-0000-0000-000000000000', nuevo_id, 'authenticated', 'authenticated', null, null,
    '{}'::jsonb, jsonb_build_object('nombre', datos->>'nombre'), now(), now(), '', '', '', '', '', '', false, false);
  insert into public.users (id, nombre, cedula, rol, padrino_id, activo, numero, celular, direccion, barrio, sector)
  values (nuevo_id, trim(datos->>'nombre'), datos->>'cedula', 'padrino', codigo, true,
    (datos->>'numero')::integer, nullif(trim(datos->>'celular'), ''), nullif(trim(datos->>'direccion'), ''),
    nullif(trim(datos->>'barrio'), ''), nullif(trim(datos->>'sector'), ''));
  return jsonb_build_object('id', nuevo_id, 'nombre', trim(datos->>'nombre'), 'padrinoId', codigo, 'activo', true);
end;
$$;
revoke all on function public.crear_padrino_sin_correo(jsonb) from public, anon, authenticated;
grant execute on function public.crear_padrino_sin_correo(jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
