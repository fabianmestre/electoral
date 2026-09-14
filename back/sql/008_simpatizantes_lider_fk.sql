-- Migra "líder asignado" en simpatizantes: antes apuntaba a una cuenta de padrino
-- (public.users), ahora apunta a la tabla real public.lideres. Ejecutar después de
-- 007_lideres.sql.
--
-- ADVERTENCIA: borra todos los simpatizantes existentes (incluida la semilla de
-- 005_seed_simpatizantes.sql), porque su lider_id apuntaba a padrinos y ya no es válido
-- contra la nueva referencia. Vuelve a ejecutar 005_seed_simpatizantes.sql después de
-- este script si quieres datos de demo.
begin;

delete from public.simpatizantes;

alter table public.simpatizantes drop constraint if exists simpatizantes_lider_id_fkey;
alter table public.simpatizantes
  add constraint simpatizantes_lider_id_fkey foreign key (lider_id) references public.lideres(id);

notify pgrst, 'reload schema';
commit;
