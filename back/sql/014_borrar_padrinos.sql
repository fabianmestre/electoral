-- Borrado atómico de perfiles de padrino y sus cuentas de acceso.
-- Ejecutar en Supabase. Este script solo crea la función; no borra datos.
begin;
create or replace function public.borrar_todos_padrinos()
returns integer language plpgsql security definer set search_path = '' as $$
declare cantidad integer;
begin
  delete from auth.users a using public.users u
    where a.id = u.id and u.rol = 'padrino';
  get diagnostics cantidad = row_count;
  return cantidad;
end;
$$;
revoke all on function public.borrar_todos_padrinos() from public, anon, authenticated;
grant execute on function public.borrar_todos_padrinos() to service_role;
notify pgrst, 'reload schema';
commit;
