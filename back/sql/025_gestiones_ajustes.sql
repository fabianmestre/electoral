-- Ejecutar después de 024_personal_en_simpatizantes.sql.
-- Ajustes de Trazabilidad de Gestiones para trabajar con datos reales.
begin;

-- 1. Quita las 120 gestiones de demostración de 011_seed_gestiones.sql. Ninguna está
--    vinculada a un simpatizante real. ELIMINA esos registros de forma permanente.
delete from public.gestiones where descripcion like '%[SEED_DEMO]%';

-- 2. La vista lista y pagina por fecha más reciente.
create index if not exists gestiones_fecha_idx on public.gestiones (fecha desc, creado_en desc);

notify pgrst, 'reload schema';
commit;
