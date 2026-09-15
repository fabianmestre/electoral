-- Ejecutar después de 019_captura_planillas_digitador.sql.
-- El líder captura una ficha reducida; el digitador conserva todos los campos.
begin;
alter table public.simpatizantes alter column departamento drop not null;
alter table public.simpatizantes alter column puesto drop not null;
alter table public.simpatizantes alter column mesa drop not null;
notify pgrst, 'reload schema';
commit;
