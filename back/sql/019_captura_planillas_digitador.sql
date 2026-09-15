-- Ejecutar después de 018_trazabilidad_simpatizantes.sql.
-- Permite capturar fielmente los campos de la planilla sin inventar datos faltantes.
begin;

alter table public.simpatizantes alter column fecha_nacimiento drop not null;
alter table public.simpatizantes alter column zona drop not null;
alter table public.simpatizantes drop constraint if exists simpatizantes_sector_zona;
alter table public.simpatizantes add constraint simpatizantes_sector_zona check (
  zona is null
  or (zona = 'Urbana' and comuna is not null and corregimiento is null)
  or (zona = 'Rural' and corregimiento is not null and comuna is null)
);

alter table public.simpatizantes add column if not exists numero_planilla integer
  check (numero_planilla is null or numero_planilla > 0);
alter table public.simpatizantes add column if not exists nombre_completo_original text
  check (nombre_completo_original is null or length(trim(nombre_completo_original)) between 2 and 200);
alter table public.simpatizantes add column if not exists tiene_vehiculo boolean;
alter table public.simpatizantes add column if not exists tipo_vehiculo_planilla text
  check (tipo_vehiculo_planilla is null or tipo_vehiculo_planilla in ('Carro', 'Moto'));
alter table public.simpatizantes drop constraint if exists simpatizantes_vehiculo_planilla_check;
alter table public.simpatizantes add constraint simpatizantes_vehiculo_planilla_check check (
  (tiene_vehiculo is true and tipo_vehiculo_planilla is not null)
  or (tiene_vehiculo is false and tipo_vehiculo_planilla is null)
  or tiene_vehiculo is null
);

grant insert (numero_planilla, nombre_completo_original, tiene_vehiculo, tipo_vehiculo_planilla)
  on public.simpatizantes to authenticated;
grant update (numero_planilla, nombre_completo_original, tiene_vehiculo, tipo_vehiculo_planilla)
  on public.simpatizantes to authenticated;

drop policy if exists digitadores_crear_simpatizantes on public.simpatizantes;
create policy digitadores_crear_simpatizantes on public.simpatizantes for insert to authenticated
with check (
  creado_por = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and u.activo and u.rol = 'digitador')
  and exists (select 1 from public.lideres l where l.id = lider_id and l.activo)
);

create index if not exists simpatizantes_numero_planilla_idx
  on public.simpatizantes (lider_id, numero_planilla);
notify pgrst, 'reload schema';
commit;
