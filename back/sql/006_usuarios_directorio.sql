-- Permite que cualquier cuenta activa vea el directorio básico de usuarios
-- (nombre, rol, padrino_id) para resolver "líder asignado" en fichas y filtros.
-- Ejecutar después de 001_users.sql.
begin;

create policy users_leer_directorio
  on public.users for select to authenticated
  using (activo = true);

notify pgrst, 'reload schema';
commit;
